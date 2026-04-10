package dev.chelly.voiceinput

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VoiceInputModule : Module() {
    private var recognizer: SpeechRecognizer? = null

    override fun definition() = ModuleDefinition {
        Name("VoiceInput")

        Events("onResult", "onError")

        Function("startListening") { locale: String ->
            val context = appContext.reactContext ?: return@Function
            recognizer?.destroy()
            recognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        val text = matches?.firstOrNull() ?: ""
                        sendEvent("onResult", mapOf("text" to text))
                    }
                    override fun onError(error: Int) {
                        sendEvent("onError", mapOf("message" to "Speech error: $error"))
                    }
                    override fun onReadyForSpeech(params: Bundle?) {}
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}
                    override fun onPartialResults(partialResults: Bundle?) {}
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                if (locale.isNotEmpty()) putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
            }
            recognizer?.startListening(intent)
        }

        Function("stopListening") {
            recognizer?.stopListening()
        }

        OnDestroy {
            recognizer?.destroy()
            recognizer = null
        }
    }
}
