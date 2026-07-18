package com.tailshare

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import android.widget.Toast

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val savedIp = TailSharePrefs.getPcIp(this)

        setContent {
            SettingsScreen(
                initialIp = savedIp,
                onSave = { ip ->
                    TailSharePrefs.savePcIp(this, ip)
                    Toast.makeText(this, "IP saved", Toast.LENGTH_SHORT).show()
                }
            )
        }
    }
}

@Composable
fun SettingsScreen(initialIp: String, onSave: (String) -> Unit) {
    var ipText by remember { mutableStateOf(TextFieldValue(initialIp)) }

    MaterialTheme {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("TailShare", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Text("Send files from phone to PC over Tailscale", style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(24.dp))
            OutlinedTextField(
                value = ipText,
                onValueChange = { ipText = it },
                label = { Text("PC Tailscale IP") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = { onSave(ipText.text) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Save")
            }
        }
    }
}
