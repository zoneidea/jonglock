package th.co.zoneidea.jonglock

import android.content.ComponentName
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class IconSwitcherModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val aliases = mapOf(
    "default" to "th.co.zoneidea.jonglock.MainActivityDefault",
    "teal" to "th.co.zoneidea.jonglock.MainActivityTeal",
    "midnight" to "th.co.zoneidea.jonglock.MainActivityMidnight",
  )

  override fun getName(): String = "IconSwitcher"

  @ReactMethod
  fun setIconName(iconKey: String, promise: Promise) {
    val selectedAlias = aliases[iconKey] ?: aliases["default"]
    val packageManager = reactContext.packageManager
    try {
      aliases.values.forEach { alias ->
        val state = if (alias == selectedAlias) {
          PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } else {
          PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        }
        packageManager.setComponentEnabledSetting(
          ComponentName(reactContext, alias),
          state,
          PackageManager.DONT_KILL_APP,
        )
      }
      promise.resolve(iconKey)
    } catch (error: Exception) {
      promise.reject("ICON_SWITCH_FAILED", error)
    }
  }

  @ReactMethod
  fun getIconName(promise: Promise) {
    val packageManager = reactContext.packageManager
    val current = aliases.entries.firstOrNull { (_, alias) ->
      packageManager.getComponentEnabledSetting(ComponentName(reactContext, alias)) ==
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED
    }?.key ?: "default"
    promise.resolve(current)
  }
}
