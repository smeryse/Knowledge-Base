# Проверка LLM

- Provider: `lmstudio`
- Endpoint: `http://127.0.0.1:1234/v1`
- Model: `qwen2.5-3b-instruct`
- Запрошенный штрихкод: `46903631802995`
- Использован fallback пример: **нет**
- Найдено кандидатов: **1**
- Время ответа: **1610 ms**
- JSON распарсен: **да**

## Кандидаты

```json
{
  "barcode": "46903631802995",
  "candidates": [
    {
      "source": "barcode-list",
      "title": "Поиск:46903631802995",
      "barcode": "46903631802995",
      "brand": "",
      "category": "прочее",
      "description": "",
      "typical_pack_size": "",
      "typical_pack_unit": "pcs",
      "perishable": false,
      "default_shelf_life_days": ""
    }
  ]
}
```

## Сырой ответ

```json
{
  "title": "",
  "barcode": "46903631802995",
  "brand": "",
  "category": "прочее",
  "base_unit": "pcs",
  "typical_pack_size": "",
  "typical_pack_unit": "pcs",
  "perishable": false,
  "default_shelf_life_days": "",
  "confidence": 0
}
```

## Распарсенный объект

```json
{
  "title": "",
  "barcode": "46903631802995",
  "brand": "",
  "category": "прочее",
  "base_unit": "pcs",
  "typical_pack_size": "",
  "typical_pack_unit": "pcs",
  "perishable": false,
  "default_shelf_life_days": "",
  "confidence": 0
}
```
