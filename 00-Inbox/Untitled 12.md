# Проверка LLM

- Provider: `lmstudio`
- Endpoint: `http://127.0.0.1:1234/v1`
- Model: `qwen2.5-3b-instruct`
- Запрошенный штрихкод: `4606038098314`
- Использован fallback пример: **нет**
- Найдено кандидатов: **1**
- Время ответа: **2622 ms**
- JSON распарсен: **да**

## Кандидаты

```json
{
  "barcode": "4606038098314",
  "candidates": [
    {
      "source": "barcode-list",
      "lookup_code": "4606038098314",
      "lookup_reason": "original",
      "title": "ЯЙЦО КУР. С1 ЩЕДРЫЙ ГОД 10 ШТ",
      "barcode": "4606038098314",
      "brand": "",
      "category": "прочее",
      "description": "ЯЙЦО КУР. С1 ЩЕДРЫЙ ГОД 10 ШТ",
      "typical_pack_size": 10,
      "typical_pack_unit": "шт",
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
  "barcode": "4606038098314",
  "brand": "",
  "category": "прочее",
  "base_unit": "pcs",
  "typical_pack_size": "10",
  "typical_pack_unit": "шт",
  "perishable": false,
  "default_shelf_life_days": "",
  "confidence": 0
}
```

## Распарсенный объект

```json
{
  "title": "",
  "barcode": "4606038098314",
  "brand": "",
  "category": "прочее",
  "base_unit": "pcs",
  "typical_pack_size": "10",
  "typical_pack_unit": "шт",
  "perishable": false,
  "default_shelf_life_days": "",
  "confidence": 0
}
```
