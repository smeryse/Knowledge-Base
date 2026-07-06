# Проверка LLM

- Provider: `lmstudio`
- Endpoint: `http://127.0.0.1:1234/v1`
- Model: `qwen2.5-3b-instruct`
- Запрошенный штрихкод: `4603793253736`
- Использован fallback пример: **да**
- Найдено кандидатов: **1**
- Время ответа: **2028 ms**
- JSON распарсен: **да**

## Кандидаты

```json
{
  "barcode": "4600702025989",
  "candidates": [
    {
      "source": "go-upc",
      "title": "Barkhatnie ruchki Крем Для Рук Бархатные Ручки Защитный, 80 Мл",
      "brand": "Barkhatnie ruchki",
      "category": "beauty",
      "description": "Крем для рук защитный"
    }
  ]
}
```

## Сырой ответ

```json
{
  "barcode": "4600702025989",
  "title": "Barkhatnie ruchki Крем Для Рук Бархатные Ручки Защитный, 80 Мл",
  "brand": "Barkhatnie ruchki",
  "category": "beauty",
  "base_unit": "ml",
  "typical_pack_size": "",
  "typical_pack_unit": "",
  "perishable": false,
  "default_shelf_life_days": "",
  "confidence": 1
}
```

## Распарсенный объект

```json
{
  "barcode": "4600702025989",
  "title": "Barkhatnie ruchki Крем Для Рук Бархатные Ручки Защитный, 80 Мл",
  "brand": "Barkhatnie ruchki",
  "category": "beauty",
  "base_unit": "ml",
  "typical_pack_size": "",
  "typical_pack_unit": "",
  "perishable": false,
  "default_shelf_life_days": "",
  "confidence": 1
}
```
