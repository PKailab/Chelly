package dev.chelly.execbridge

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class ExecBridgeModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExecBridge")

        AsyncFunction("execCommand") { command: String, cwd: String, timeoutMs: Int ->
            val linkerPath = findLinker()
            val bashPath = findBash()
            val ldLibPath = findLdLibPath()
            val homePath = System.getenv("HOME") ?: "/data/data/dev.chelly.app/files"
            val workDir = if (cwd.isNotEmpty()) cwd else "$homePath/chelly/workspace"
            File(workDir).mkdirs()

            val result = ChellyJNI.execSubprocess(
                linkerPath, bashPath, ldLibPath, homePath, workDir, command, timeoutMs
            )
            mapOf(
                "exitCode" to (result[0].toIntOrNull() ?: -1),
                "stdout" to result[1],
                "stderr" to result[2]
            )
        }
    }

    private fun findLinker(): String {
        val candidates = listOf(
            "/system/bin/linker64",
            "/apex/com.android.runtime/bin/linker64",
            "/system/bin/linker"
        )
        return candidates.firstOrNull { File(it).exists() }
            ?: throw RuntimeException("linker64 not found")
    }

    private fun findBash(): String {
        val appLib = appContext.reactContext?.applicationInfo?.nativeLibraryDir ?: ""
        val candidates = listOf("$appLib/libbash.so", "/system/bin/sh")
        return candidates.firstOrNull { File(it).exists() } ?: "/system/bin/sh"
    }

    private fun findLdLibPath(): String {
        return appContext.reactContext?.applicationInfo?.nativeLibraryDir ?: ""
    }
}
