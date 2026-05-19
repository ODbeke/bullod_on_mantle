from collections.abc import Sequence


def ema(values: Sequence[float], period: int) -> float:
    if not values:
        return 0.0
    alpha = 2 / (period + 1)
    result = values[0]
    for value in values[1:]:
        result = alpha * value + (1 - alpha) * result
    return result


def rsi(values: Sequence[float], period: int = 14) -> float:
    if len(values) <= period:
        return 50.0
    gains = []
    losses = []
    recent = values[-(period + 1):]
    for previous, current in zip(recent, recent[1:]):
        change = current - previous
        gains.append(max(change, 0))
        losses.append(abs(min(change, 0)))
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    relative_strength = avg_gain / avg_loss
    return 100 - (100 / (1 + relative_strength))


def macd(values: Sequence[float]) -> tuple[float, float]:
    if len(values) < 26:
        return 0.0, 0.0
    macd_line = ema(values, 12) - ema(values, 26)
    signal_line = ema([ema(values[: index + 1], 12) - ema(values[: index + 1], 26) for index in range(25, len(values))], 9)
    return macd_line, signal_line


def bollinger(values: Sequence[float], period: int = 20, width: float = 2.0) -> tuple[float, float, float]:
    if len(values) < period:
        close = values[-1] if values else 0.0
        return close, close, close
    window = values[-period:]
    mean = sum(window) / period
    variance = sum((value - mean) ** 2 for value in window) / period
    deviation = variance**0.5
    return mean - width * deviation, mean, mean + width * deviation


def atr(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float], period: int = 14) -> float:
    if len(closes) <= period:
        return 0.0
    ranges = []
    for index in range(1, len(closes)):
        ranges.append(max(highs[index] - lows[index], abs(highs[index] - closes[index - 1]), abs(lows[index] - closes[index - 1])))
    return sum(ranges[-period:]) / period


def adx(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float], period: int = 14) -> float:
    current_atr = atr(highs, lows, closes, period)
    if current_atr == 0 or len(closes) <= period:
        return 0.0
    directional_moves = [abs(closes[index] - closes[index - 1]) for index in range(1, len(closes))]
    return min(100.0, (sum(directional_moves[-period:]) / period) / current_atr * 35)


def pivot_points(high: float, low: float, close: float) -> tuple[float, float, float]:
    pivot = (high + low + close) / 3
    support = 2 * pivot - high
    resistance = 2 * pivot - low
    return support, pivot, resistance
