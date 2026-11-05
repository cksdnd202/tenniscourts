import * as Location from 'expo-location';
import { Platform } from 'react-native';

const RECENT_LOCATION_MAX_AGE_MS = 3 * 60 * 1000;
// Accept coarse Android fixes for nearby discovery instead of repeatedly
// discarding them because they exceed the precise-location cache cutoff.
const RECENT_LOCATION_REQUIRED_ACCURACY_METERS = Platform.OS === 'android' ? 3000 : 500;
const FRESH_LOCATION_TIMEOUT_MS = 8000;

let rememberedLocation: Location.LocationObject | null = null;
let freshLocationPromise: Promise<Location.LocationObject> | null = null;

function isUsableRecentLocation(location: Location.LocationObject | null) {
  if (!location) return false;

  const age = Date.now() - location.timestamp;
  const accuracy = location.coords.accuracy;
  return age >= 0
    && age <= RECENT_LOCATION_MAX_AGE_MS
    && typeof accuracy === 'number'
    && accuracy <= RECENT_LOCATION_REQUIRED_ACCURACY_METERS;
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
  if (isUsableRecentLocation(rememberedLocation)) return rememberedLocation;

  const lastKnownLocation = await Location.getLastKnownPositionAsync({
    maxAge: RECENT_LOCATION_MAX_AGE_MS,
    requiredAccuracy: RECENT_LOCATION_REQUIRED_ACCURACY_METERS,
  });
  return lastKnownLocation ? rememberLocation(lastKnownLocation) : null;
}

export async function getFreshLocationAsync() {
  if (!freshLocationPromise) {
    freshLocationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
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
  return getLocationDistanceMeters(previous, next) >= minimumDistanceMeters;
}
