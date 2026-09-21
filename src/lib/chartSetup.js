// Pendaftaran Chart.js dipisah ke modul sendiri agar chunk vendor-chart
// (±264 kB) di-lazy-load: dashboard dapat ter-render lebih dulu, grafik
// menyusul sesaat kemudian saat chunk selesai dimuat (code-splitting).
import { Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  PointElement, LineElement, Filler,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler)
ChartJS.defaults.font.family = 'Inter, ui-sans-serif, system-ui, sans-serif'
ChartJS.defaults.font.size = 11
ChartJS.defaults.color = '#64748b'

export { Doughnut, Line }
