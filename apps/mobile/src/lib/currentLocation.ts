import { requireNativeModule } from 'expo-modules-core';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

const nativeLocationButton = Platform.OS === 'android'
  ? requireNativeModule<{getPermissionScope(): 'fine' | 'coarse' | 'none'}>('CourtsLocationButton')
  : null;

export async function getForegroundLocationPermissionsAsync() {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!nativeLocationButton) return permission;
  const accuracy = nativeLocationButton.getPermissionScope();
  return {
    ...permission,
    granted: accuracy !== 'none',
    status: accuracy !== 'none' ? Location.PermissionStatus.GRANTED : permission.status,
    android: { ...permission.android, accuracy },
  };
}

const RECENT_LOCATION_MAX_AGE_MS = 3 * 60 * 1000;
const PRECISE_CACHE_ACCURACY_METERS = 500;
const APPROXIMATE_CACHE_ACCURACY_METERS = 3000;
const FRESH_LOCATION_TIMEOUT_MS = 8000;

let rememberedLocation: Location.LocationObject | null = null;
let freshLocationPromise: Promise<Location.LocationObject> | null = null;

function isUsableRecentLocation(location: Location.LocationObject | null, requiredAccuracy: number) {
  if (!location) return false;

  const age = Date.now() - location.timestamp;
  const accuracy = location.coords.accuracy;
  return age >= 0
    && age <= RECENT_LOCATION_MAX_AGE_MS
    && typeof accuracy === 'number'
    && accuracy <= requiredAccuracy;
}

function rememberLocation(location: Location.LocationObject) {
  rememberedLocation = location;
  return location;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('location-timeout')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function getRecentLocationAsync() {
  // Reject a coarse cached fix after the user enables precise location, while
  // still reusing approximate fixes when that is the user's permission choice.
  const permission = Platform.OS === 'android'
    ? await getForegroundLocationPermissionsAsync()
    : null;
  const requiredAccuracy = permission?.android?.accuracy === 'coarse'
    ? APPROXIMATE_CACHE_ACCURACY_METERS
    : PRECISE_CACHE_ACCURACY_METERS;
  if (isUsableRecentLocation(rememberedLocation, requiredAccuracy)) return rememberedLocation;

  const lastKnownLocation = await Location.getLastKnownPositionAsync({
    maxAge: RECENT_LOCATION_MAX_AGE_MS,
    requiredAccuracy,
  });
  return lastKnownLocation ? rememberLocation(lastKnownLocation) : null;
}

export async function getFreshLocationAsync() {
  if (!freshLocationPromise) {
    freshLocationPromise = Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced,
    })
      .then(rememberLocation)
      .finally(() => {
        freshLocationPromise = null;
      });
  }

  return withTimeout(freshLocationPromise, FRESH_LOCATION_TIMEOUT_MS);
}

export function getLocationCoordinates(location: Location.LocationObject) {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export function getLocationDistanceMeters(
  first: Location.LocationObject,
  second: Location.LocationObject,
) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(second.coords.latitude - first.coords.latitude);
  const longitudeDelta = toRadians(second.coords.longitude - first.coords.longitude);
  const firstLatitude = toRadians(first.coords.latitude);
  const secondLatitude = toRadians(second.coords.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

export function hasMeaningfulLocationChange(
  previous: Location.LocationObject,
  next: Location.LocationObject,
  minimumDistanceMeters = 50,
) {
  const accuracyImproved = typeof previous.coords.accuracy === 'number'
    && typeof next.coords.accuracy === 'number'
    && next.coords.accuracy < previous.coords.accuracy;
  return accuracyImproved || getLocationDistanceMeters(previous, next) >= minimumDistanceMeters;
}
