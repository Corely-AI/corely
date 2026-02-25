package com.corely.poshardware

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.ModulesProvider

class CorelyPosHardwarePackage : ModulesProvider {
  override fun getModulesList(): List<Class<out Module>> {
    return listOf(CorelyPosHardwareModule::class.java)
  }
}

