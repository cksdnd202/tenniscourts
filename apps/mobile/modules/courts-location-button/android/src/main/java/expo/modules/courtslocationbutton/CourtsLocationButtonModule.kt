package expo.modules.courtslocationbutton

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.view.View
import androidx.core.content.ContextCompat
import androidx.core.locationbutton.LocationButton
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher

class CourtsLocationButtonModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CourtsLocationButton")
    Function("getPermissionScope") {
      val context = appContext.reactContext ?: return@Function "none"
      when {
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED -> "fine"
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED -> "coarse"
        else -> "none"
      }
    }
    View(CourtsLocationButtonView::class) {
      Events("onResult", "onError")
      Prop("iconOnly") { view: CourtsLocationButtonView, value: Boolean -> view.configure(value) }
    }
  }
}

class CourtsLocationButtonView(context: Context, private val owner: AppContext) : ExpoView(context, owner) {
  private val onResult by EventDispatcher()
  private val onError by EventDispatcher()
  private val button = LocationButton(context).apply {
    id = View.generateViewId()
    parentActivity = owner.currentActivity
    setOnPermissionResultListener { granted ->
      // The pre-17 fallback reports fine only. Respect approximate permission too.
      val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
      onResult(mapOf("granted" to (granted || coarse)))
    }
    setOnErrorListener { onError(mapOf("message" to "위치 버튼을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.")) }
  }
  init { addView(button); configure(false) }
  override fun onAttachedToWindow() {
    button.parentActivity = owner.currentActivity
    super.onAttachedToWindow()
  }
  fun configure(iconOnly: Boolean) {
    button.setTextType(if (iconOnly) LocationButton.TEXT_TYPE_NONE else LocationButton.TEXT_TYPE_USE_PRECISE_LOCATION)
    button.setBackgroundColor(if (iconOnly) Color.WHITE else Color.rgb(48, 194, 124))
    button.setTextColor(Color.WHITE)
    button.setIconTint(if (iconOnly) Color.rgb(75, 85, 99) else Color.WHITE)
    button.setCornerRadius(8 * resources.displayMetrics.density)
    button.setStrokeWidth(if (iconOnly) resources.displayMetrics.density.toInt().coerceAtLeast(1) else 0)
    button.setStrokeColor(Color.rgb(207, 216, 227))
  }
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    button.layout(0, 0, right - left, bottom - top)
  }
  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    super.onMeasure(widthMeasureSpec, heightMeasureSpec)
    button.measure(MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY))
  }
}
