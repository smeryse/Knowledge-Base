Нашёл на самой странице модели на Civitai, в разделе **Details**:

> **Trigger Words**  
> `ng_deepnegative_v1_75t`

Там же указано: _«put it in **negative** prompts»_.

Если нужны детали по другим версиям (64T, 32T и т.д.) или нюансы использования — скажи, вытяну конкретику со страницы.


worst quality, low quality, logo, text, watermark, username, ng_deepnegative_v1_75, score_6, score_5, score_4, source_pony, ugly, ugly girl, ugly face, source_anime, source_furry, source_cartoon, worst quality, low quality, normal quality, lowres, bad anatomy, bad hands, signature, watermarks, ugly, imperfect eyes, skewed eyes, unnatural face, unnatural body, error, extra limb, missing limbs, painting by bad-artist, hairy pussy, FastNegativeV2, fcNeg, bad-picture-chill-75v, CyberRealistic_Negative. fat, 2D, 3D, cartoon, painting, defects, low quality, bad quality. fat,


```pp
instagram photo, closeup face photo of 23 y.o Chloe, pale skin, (smile:0.4), green eyes, cute face, adorable, alluring, alternative vibe, boho, hipster, cleavage, large nude breasts, nipples, nude body, skinny, tiny waist, long legs, soft skin, perfect skin, shiny hair, looking at viewer, slightly open mouth, focus on eyes, beautiful eyes, detailed eyes, perfect eyes, bokeh, pov, from above, from straight, [score_9, score_8_up, score_7_up], realistic, realism, photorealistic, realistic detailed face, HD, perfect quality, 16k, very detailed, outstanding style, realistic lighting, perfect lighting, daylight, hard shadows
```
```np
worst quality, low quality, logo, text, watermark, username, ng_deepnegative_v1_75, score_6, score_5, score_4, source_pony, ugly, ugly girl, ugly face, source_anime, source_furry, source_cartoon, worst quality, low quality, normal quality, lowres, bad anatomy, bad hands, signature, watermarks, ugly, imperfect eyes, skewed eyes, unnatural face, unnatural body, error, extra limb, missing limbs, painting by bad-artist, hairy pussy, FastNegativeV2, fcNeg, bad-picture-chill-75v, CyberRealistic_Negative. fat, 2D, 3D, cartoon, painting, defects, low quality, bad quality. fat,
```

Привет. Разобрал технические параметры, промпты, как просил, пропускаю.

**Базовая генерация:**
- `Steps: 6` — критически мало. Для `DPM++ SDE Karras` нужно минимум 20–30. При 6 изображение останется шумным и недоработанным.
- `CFG scale: 2` — модель почти игнорирует запрос. Стандарт 5–8. При 2 стиль и композиция сильно «уплывают».
- `Sampler: DPM++ SDE Karras` — даёт хорошую детализацию, но требует высоких шагов и нормального CFG. Чувствителен к низким значениям.
- `Seed: 3010107404` — фиксирует начальный шум. Позволяет точно воспроизвести результат при тех же настройках.
- `VAE: vae-ft-mse-840000-ema-pruned.safetensors` — стандартный декодер для SD 1.5. Делает цвета насыщеннее, убирает сероватый оттенок.
- `Size: 512x768` — портрет 2:3. Безопасное разрешение для SD 1.5, минимизирует искажения пропорций.
- `Model: RVHYPO v1.7.0 (hash: 0928b30687)` — основной чекпоинт. Версия и хеш подтверждают конкретный билд, скорее всего аниме/иллюстративная модель на базе SD 1.5.

**Hires Fix (апскейл):**
- `Hires steps: 3` — слишком мало. Обычно 10–20. При 3 детали не добавляются, только мылится текстура.
- `Hires upscale: 2` — удваивает разрешение. Итог ~1024x1536. Стандартно.
- `Hires upscaler: 4x_NMKD-Superscale-SP_178000_G` — реалистичный апскейлер. Хорошо работает с фото, но может сглаживать аниме-линии.
- `Denoising strength: 0.35` — сила изменений при Hires fix. Безопасно, но слабо. Для добавления деталей обычно 0.45–0.55.

**ADetailer (автодорисовка лиц):**
- `ADetailer model: face_yolov8n.pt` — быстрый детектор лиц. Ловит основные лица, но может пропускать сложные ракурсы или перекрытые объекты.
- `ADetailer sampler: DPM++ SDE Karras` — дублирует основной сэмплер. Для лиц часто стабильнее `DPM++ 2M Karras` или `Euler a`.
- `ADetailer version: 24.1.2` — актуальная версия расширения.
- `ADetailer mask blur: 4` — размытие краев маски. Стандартно, обеспечивает плавный переход между лицом и фоном.
- `ADetailer confidence: 0.3` — низкий порог срабатывания. Будет ловить больше лиц, но возможны ложные срабатывания на текстурах. Обычно 0.35–0.5.
- `ADetailer dilate erode: 4` — слегка расширяет маску. Помогает захватить область у шеи и линии роста волос.
- `ADetailer inpaint padding: 32` — отступ от маски. Минимально допустимый. Для крупных лиц лучше 48–64, чтобы нейросеть видела больше контекста.
- `ADetailer denoising strength: 0.25` — очень бережная дорисовка. Лицо почти не меняется. Для исправления артефактов нужно 0.4–0.6.
- `ADetailer inpaint only masked: True` — меняет только выделенную область, фон не трогает. Стандартная настройка.
- `ADetailer use separate sampler: True` — позволяет использовать отдельный сэмплер для ADetailer (включено выше). Полезно для независимой тонкой настройки.

**Итог:** Конфигурация настроена на минимальное вмешательство модели. Главные точки роста — поднять `Steps` до 20+, `CFG` до 5–7, `Hires steps` до 12–15 и `ADetailer denoising` до 0.4. Иначе результат будет мутным, а лица останутся без существенной доработки.

Нужно подкрутить что-то конкретное или объяснить, как параметры влияют друг на друга — пиши.


(monochrome:0.75), (Sketch art, line art, drawn:2),1girl, solo, long hair, breasts, brown hair, standing, underwear, panties, ass, thighs, small breasts, indoors, from behind, bra, white panties, window, back, from below, underwear only, curtains, lingerie, letterboxed, thong, white bra, ass focus, head out of frame, lace-trimmed panties, lace panties, ass | | masterwork, masterpiece, best quality, detailed, depth of field, , high detail, best quality, very aesthetic, 8k, dynamic pose, depth of field, dynamic angle, adult, aged up, Negative prompt: lowres, worst quality, low quality, bad anatomy, bad hands, jpeg artifacts, signature, watermark, text, logo, artist name, extra digits, censored, patreon username, loli Steps: 40, CFG scale: 6, Sampler: Euler a, Seed: 210108720256428, Model: aMixIllustrious_aMix, width: 1536, height: 2304, Version: ComfyUI, Clip skip: 2