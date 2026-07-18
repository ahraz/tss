package com.tailshare

import android.content.Context
import android.content.SharedPreferences

object TailSharePrefs {
    private const val PREFS_NAME = "tailshare_prefs"
    private const val KEY_PC_IP = "pc_ip"

    fun getPcIp(context: Context): String {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_PC_IP, "") ?: ""
    }

    fun savePcIp(context: Context, ip: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PC_IP, ip)
            .apply()
    }
}
