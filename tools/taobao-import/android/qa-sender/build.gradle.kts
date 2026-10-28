plugins { id("com.android.application") }
android {
    namespace = "com.sindarealest.taobaoimport.qasender"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.sindarealest.taobaoimport.qasender"
        minSdk = 29
        targetSdk = 35
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
