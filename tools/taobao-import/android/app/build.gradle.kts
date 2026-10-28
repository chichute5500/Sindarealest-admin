plugins { id("com.android.application") }
android {
    namespace = "com.sindarealest.taobaoimport"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.sindarealest.taobaoimport"
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "0.2.0-qa"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies { implementation("androidx.browser:browser:1.10.0") }
