# Proguard rules for SS-CAM Android

-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**

# Retrofit & Gson data models
-keep class com.google.gson.** { *; }
-keep class com.suamisihat.sscam.data.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Coil Image Loading
-dontwarn coil.**
-keep class coil.** { *; }
