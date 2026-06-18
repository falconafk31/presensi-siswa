<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { CheckCircle2, X } from 'lucide-vue-next'

const {
  needRefresh,
  updateServiceWorker,
} = useRegisterSW()

function close() {
  needRefresh.value = false
}
</script>

<template>
  <div v-if="needRefresh" class="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-4 rounded-xl border border-emerald-100 bg-white p-4 shadow-xl">
    <div class="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-600">
      <CheckCircle2 class="h-5 w-5" />
    </div>
    <div class="flex-1">
      <h3 class="font-semibold text-gray-900">Versi Baru Tersedia!</h3>
      <p class="mt-1 text-sm text-gray-600">
        Aplikasi telah diperbarui dengan fitur atau perbaikan terbaru. Klik "Muat Ulang" untuk menerapkan pembaruan.
      </p>
      <div class="mt-3 flex gap-2">
        <button 
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          @click="updateServiceWorker()"
        >
          Muat Ulang
        </button>
        <button 
          class="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          @click="close"
        >
          Nanti
        </button>
      </div>
    </div>
    <button class="text-gray-400 hover:text-gray-500" @click="close">
      <X class="h-5 w-5" />
    </button>
  </div>
</template>
