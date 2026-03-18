package com.ismayil.satisapp;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.util.Set;
import java.util.UUID;

public class MainActivity extends AppCompatActivity {
    private static final int REQUEST_BLUETOOTH_CONNECT = 1101;
    private static final UUID ESC_POS_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        requestBluetoothPermissionIfNeeded();

        webView = findViewById(R.id.webview);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_OFF);
        }

        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AndroidPrinterBridge(), "AndroidPrinter");
        webView.loadUrl("file:///android_asset/webapp/index.html");
    }

    private void requestBluetoothPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.BLUETOOTH_CONNECT}, REQUEST_BLUETOOTH_CONNECT);
            }
        }
    }

    private boolean hasBluetoothPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        return ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_BLUETOOTH_CONNECT && webView != null) {
            webView.post(() -> webView.evaluateJavascript("window.dispatchEvent(new Event('bluetooth-permission-updated'));", null));
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private class AndroidPrinterBridge {
        @JavascriptInterface
        public boolean isAvailable() {
            return BluetoothAdapter.getDefaultAdapter() != null;
        }

        @JavascriptInterface
        public String getPairedPrintersJson() {
            JSONArray jsonArray = new JSONArray();
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                return jsonArray.toString();
            }
            if (!hasBluetoothPermission()) {
                requestBluetoothPermissionIfNeeded();
                return jsonArray.toString();
            }
            try {
                Set<BluetoothDevice> devices = adapter.getBondedDevices();
                for (BluetoothDevice device : devices) {
                    JSONObject item = new JSONObject();
                    item.put("name", device.getName() == null ? device.getAddress() : device.getName());
                    item.put("address", device.getAddress());
                    jsonArray.put(item);
                }
            } catch (Exception ignored) {
            }
            return jsonArray.toString();
        }

        @JavascriptInterface
        public String printText(String address, String text) {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                return "Xeta: Bluetooth desteklenmir.";
            }
            if (!adapter.isEnabled()) {
                return "Xeta: Bluetooth aktiv deyil.";
            }
            if (!hasBluetoothPermission()) {
                requestBluetoothPermissionIfNeeded();
                return "Xeta: Bluetooth icazesi verilmeyib.";
            }
            if (address == null || address.trim().isEmpty()) {
                return "Xeta: Printer secilmeyib.";
            }

            BluetoothSocket socket = null;
            OutputStream outputStream = null;
            try {
                BluetoothDevice device = adapter.getRemoteDevice(address);
                adapter.cancelDiscovery();
                socket = device.createRfcommSocketToServiceRecord(ESC_POS_UUID);
                socket.connect();
                outputStream = socket.getOutputStream();
                outputStream.write(buildEscPosPayload(text == null ? "" : text));
                outputStream.flush();
                return "Çap gonderildi.";
            } catch (Exception error) {
                return "Xeta: " + (error.getMessage() == null ? "Cap alinmadi" : error.getMessage());
            } finally {
                try {
                    if (outputStream != null) {
                        outputStream.close();
                    }
                } catch (Exception ignored) {
                }
                try {
                    if (socket != null) {
                        socket.close();
                    }
                } catch (Exception ignored) {
                }
            }
        }

        private byte[] buildEscPosPayload(String text) {
            try {
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                output.write(new byte[]{0x1B, 0x40});
                output.write(new byte[]{0x1B, 0x61, 0x00});
                output.write(sanitizeForPrinter(text).getBytes(Charset.forName("windows-1254")));
                output.write(new byte[]{0x0A, 0x0A, 0x0A});
                output.write(new byte[]{0x1D, 0x56, 0x41, 0x10});
                return output.toByteArray();
            } catch (Exception ignored) {
                return (text + "\n\n\n").getBytes();
            }
        }

        private String sanitizeForPrinter(String text) {
            return text
                    .replace("Ə", "E")
                    .replace("ə", "e")
                    .replace("Ğ", "G")
                    .replace("ğ", "g")
                    .replace("İ", "I")
                    .replace("ı", "i")
                    .replace("Ş", "S")
                    .replace("ş", "s")
                    .replace("Ç", "C")
                    .replace("ç", "c")
                    .replace("Ö", "O")
                    .replace("ö", "o")
                    .replace("Ü", "U")
                    .replace("ü", "u")
                    .replace("₼", " AZN ");
        }
    }
}
