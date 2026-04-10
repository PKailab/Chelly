package dev.chelly.execbridge

object ChellyJNI {
    init {
        System.loadLibrary("chelly-exec")
    }

    @JvmStatic
    external fun execSubprocess(
        linkerPath: String,
        bashPath: String,
        ldLibPath: String,
        homePath: String,
        cwd: String,
        command: String,
        timeoutMs: Int
    ): Array<String>
}
