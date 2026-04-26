# Проверка LLM

- Provider: `lmstudio`
- Endpoint: `http://127.0.0.1:1234/v1`
- Model: `qwen2.5-3b-instruct`
- Запрошенный штрихкод: `4603793253736`
- Использован fallback пример: **нет**
- Найдено кандидатов: **1**
- Время ответа: **2239 ms**
- JSON распарсен: **да**

## Кандидаты

```json
{
  "barcode": "4603793253736",
  "candidates": [
    {
      "source": "barcode-list",
      "title": "ВАФЛИ ВОЛЖСКИЙ ПЕКАРЬ 400ГР",
      "barcode": "4603793253736",
      "brand": "Волжский пекарь",
      "category": "сладости",
      "description": "ВАФЛИ ВОЛЖСКИЙ ПЕКАРЬ 400ГР | ВАФЛИ \"ВОЛЖСКИЙ ПЕКАРЬ\" ТОПЛЕН.МОЛОКО 400ГР | ВАФЛИ ПАЧКА 400ГР | ВАФЛИ ТОП.МОЛОКО ВП 0.4 | KLOMENSKIY WAFLI 400 GR",
      "typical_pack_size": 400,
      "typical_pack_unit": "гр",
      "perishable": false,
      "default_shelf_life_days": ""
    }
  ]
}
```

## Сырой ответ

```json
{
  "title": "ВАФЛИ ВОЛЖСКИЙ ПЕКАРЬ 400ГР",
  "barcode": "4603793253736",
  "brand": "Волжский пекарь",
  "category": "сладости",
  "base_unit": "гр",
  "typical_pack_size": 400,
  "typical_pack_unit": "гр",
  "perishable": false,
  "default_shelf_life_days": "",
  "confidence": 1
}
```

## Распарсенный объект

```json
{
  "title": "ВАФЛИ ВОЛЖСКИЙ ПЕКАРЬ 400ГР",
  "barcode": "4603793253736",
  "brand": "Волжский пекарь",
  "category": "сладости",
  "base_unit": "гр",
  "typical_pack_size": 400,
  "typical_pack_unit": "гр",
  "perishable": false,
  "default_shelf_life_days": "",
  "confidence": 1
}
```
