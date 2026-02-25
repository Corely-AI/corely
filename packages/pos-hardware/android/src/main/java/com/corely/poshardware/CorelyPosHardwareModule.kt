package com.corely.poshardware

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.time.Instant
import java.util.UUID

class CorelyPosHardwareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CorelyPosHardware")

    Events("onStatusChanged")

    AsyncFunction("listDevices") {
      listOf(
        mapOf(
          "id" to "android-usb-tse",
          "name" to "Android USB TSE (stub)",
          "vendor" to "Stub",
          "connected" to false,
          "capabilities" to listOf("TSE")
        )
      )
    }

    AsyncFunction("connect") { _: String ->
      sendEvent(
        "onStatusChanged",
        mapOf("deviceId" to "android-usb-tse", "connected" to true)
      )
      null
    }

    AsyncFunction("getCapabilities") {
      listOf("TSE")
    }

    AsyncFunction("initializeTse") {
      null
    }

    AsyncFunction("startTseTransaction") { _: Map<String, Any?> ->
      mapOf(
        "transactionId" to UUID.randomUUID().toString(),
        "startedAt" to Instant.now().toString()
      )
    }

    AsyncFunction("finishTseTransaction") { input: Map<String, Any?> ->
      mapOf(
        "transactionId" to input["transactionId"],
        "signature" to "NATIVE-STUB-SIGNATURE",
        "finishedAt" to Instant.now().toString()
      )
    }

    AsyncFunction("exportTseData") {
      """{"provider":"android-stub","exportedAt":"${Instant.now()}"}"""
    }

    AsyncFunction("getTseStatus") {
      mapOf(
        "ready" to true,
        "mode" to "NATIVE"
      )
    }
  }
}

