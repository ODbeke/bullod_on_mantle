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


def stochastic(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float], period: int = 14, k_smooth: int = 3) -> tuple[float, float]:
    """Calculate Stochastic Oscillator %K and %D."""
    if len(closes) < period:
        return 50.0, 50.0
    
    k_values = []
    # Calculate %K for enough recent points to smooth it
    for i in range(len(closes) - k_smooth, len(closes)):
        window_highs = highs[i - period + 1 : i + 1]
        window_lows = lows[i - period + 1 : i + 1]
        highest_high = max(window_highs) if window_highs else 1.0
        lowest_low = min(window_lows) if window_lows else 0.0
        denom = highest_high - lowest_low
        if denom == 0:
            k = 50.0
        else:
            k = ((closes[i] - lowest_low) / denom) * 100
        k_values.append(k)
        
    pct_k = k_values[-1]
    pct_d = sum(k_values) / len(k_values)
    return pct_k, pct_d


def cci(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float], period: int = 20) -> float:
    """Calculate Commodity Channel Index."""
    if len(closes) < period:
        return 0.0
    tp = [(h + l + c) / 3 for h, l, c in zip(highs[-period:], lows[-period:], closes[-period:])]
    sma_tp = sum(tp) / period
    mean_dev = sum(abs(t - sma_tp) for t in tp) / period
    if mean_dev == 0:
        return 0.0
    return (tp[-1] - sma_tp) / (0.015 * mean_dev)


def williams_r(highs: Sequence[float], lows: Sequence[float], closes: Sequence[float], period: int = 14) -> float:
    """Calculate Williams %R."""
    if len(closes) < period:
        return -50.0
    window_highs = highs[-period:]
    window_lows = lows[-period:]
    highest_high = max(window_highs) if window_highs else 1.0
    lowest_low = min(window_lows) if window_lows else 0.0
    denom = highest_high - lowest_low
    if denom == 0:
        return -50.0
    return ((highest_high - closes[-1]) / denom) * -100


def roc(values: Sequence[float], period: int = 12) -> float:
    """Calculate Rate of Change."""
    if len(values) <= period:
        return 0.0
    prev_val = values[-period - 1]
    if prev_val == 0:
        return 0.0
    return ((values[-1] - prev_val) / prev_val) * 100
