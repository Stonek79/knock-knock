# RTK - Rust Token Killer

**Usage**: Token-optimized CLI proxy for shell commands.

## Optional usage

Используйте `rtk`, если он установлен и сокращённый вывод не скрывает diagnostic,
необходимый для текущей задачи. Это оптимизация, а не обязательное правило.
При ошибке, несовместимости или необходимости полного вывода запускайте исходную
команду напрямую.

Examples:

```bash
rtk git status
rtk cargo test
rtk ls src/
rtk grep "pattern" src/
rtk find "*.rs" .
rtk docker ps
rtk gh pr list
```

## Meta Commands

```bash
rtk gain              # Show token savings
rtk gain --history    # Command history with savings
rtk discover          # Find missed RTK opportunities
rtk proxy <cmd>       # Run raw (no filtering, for debugging)
```

## Why

RTK filters and compresses command output before it reaches the LLM context.
