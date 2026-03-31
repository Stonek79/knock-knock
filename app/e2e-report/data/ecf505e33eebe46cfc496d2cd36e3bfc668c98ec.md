# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - banner [ref=e10]:
      - generic [ref=e11]: Knock Knock
      - button "Создать чат" [ref=e12] [cursor=pointer]:
        - img [ref=e13]
    - navigation [ref=e58]:
      - link "Чаты" [ref=e59] [cursor=pointer]:
        - /url: /chat
        - img [ref=e61]
        - generic [ref=e63]: Чаты
      - link "Избранное" [ref=e64] [cursor=pointer]:
        - /url: /favorites
        - img [ref=e66]
        - generic [ref=e68]: Избранное
      - link "Звонки" [ref=e69] [cursor=pointer]:
        - /url: /calls
        - img [ref=e71]
        - generic [ref=e73]: Звонки
      - link "Настройки" [ref=e74] [cursor=pointer]:
        - /url: /settings
        - img [ref=e76]
        - generic [ref=e79]: Настройки
  - region "Notifications (F8)":
    - list
```