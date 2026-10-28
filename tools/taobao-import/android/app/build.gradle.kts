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
    buildFeatures { buildConfig = true }
    // Release signing credentials are injected only by a protected CI job.
    // Never ship a per-run debug key: it would prevent install-over updates.
    signingConfigs {
        create("ownerRelease") {
            storeFile = file(System.getenv("SD_TAOBAO_RELEASE_KEYSTORE_FILE") ?: "not-configured-release-keystore.p12")
            storePassword = System.getenv("SD_TAOBAO_RELEASE_STORE_PASSWORD") ?: ""
            keyAlias = System.getenv("SD_TAOBAO_RELEASE_KEY_ALIAS") ?: ""
            keyPassword = System.getenv("SD_TAOBAO_RELEASE_KEY_PASSWORD") ?: ""
        }
    }
    buildTypes {
        getByName("debug") {
            buildConfigField("String", "ADMIN_IMPORT_URL",
                "\"https://taobao-import-20261028.sindarealest-admin-preview.pages.dev/admin/taobao-import.html\"")
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("ownerRelease")
            buildConfigField("String", "ADMIN_IMPORT_URL",
                "\"https://sindarealest2.pages.dev/admin/taobao-import.html\"")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies { implementation("androidx.browser:browser:1.10.0") }
