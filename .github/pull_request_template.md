## Summary

<!-- Ringkasan 1–3 kalimat: apa dan mengapa. -->

## Changes

<!-- Daftar perubahan penting. Tandai file/area yang disentuh. -->

-
-

## Testing

<!-- Bukti verifikasi. Wajib: guard + build. QA manual bila ada perubahan perilaku/UI. -->

- [ ] `node scripts/check-template-bindings.mjs` lolos
- [ ] `npm run build` lolos
- [ ] QA manual per checklist `docs/testing.md` (bila relevan): …

## Security / Database Impact

<!-- Wajib diisi eksplisit. Tulis "Tidak ada" bila memang tidak menyentuh DB/auth/RLS. -->

- Perubahan database/RLS/policy/trigger/auth: <!-- Tidak ada / jelaskan -->
- Dampak RLS diulas: <!-- Ya / Tidak relevan -->

## Screenshots (if UI change)

<!-- Sebelum vs sesudah; sertakan tampilan mobile bila mengubah layout. -->

## Checklist

- [ ] Build passes
- [ ] No unintended database changes
- [ ] RLS impact reviewed
- [ ] Mobile checked for UI changes
- [ ] Documentation updated (README/docs/CHANGELOG bila relevan)
