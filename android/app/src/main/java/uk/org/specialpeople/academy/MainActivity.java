package uk.org.specialpeople.academy;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        pinLayoutViewportToDeviceWidth();
    }

    private void pinLayoutViewportToDeviceWidth() {
        // Native viewport guard: keep this in MainActivity (not generated files) so
        // `npx cap sync` cannot re-enable Android WebView wide-viewport layout.
        if (getBridge() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        if (webView == null) {
            return;
        }

        WebSettings settings = webView.getSettings();
        if (settings == null) {
            return;
        }

        settings.setUseWideViewPort(false);
        settings.setLoadWithOverviewMode(false);
    }
}
