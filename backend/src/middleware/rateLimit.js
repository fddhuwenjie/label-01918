/**
 * 轻量级内存速率限制中间件
 * 无需额外依赖
 */

function createRateLimiter(options) {
  var windowMs = options.windowMs || 60000;       // 时间窗口，默认 1 分钟
  var max = options.max || 100;                    // 窗口内最大请求数
  var message = options.message || '请求过于频繁，请稍后再试';

  var hits = new Map();

  // 定期清理过期记录
  setInterval(function() {
    var now = Date.now();
    hits.forEach(function(record, key) {
      if (now - record.resetTime > 0) {
        hits.delete(key);
      }
    });
  }, windowMs);

  return function(req, res, next) {
    var key = req.ip || req.connection.remoteAddress;
    var now = Date.now();
    var record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      hits.set(key, record);
    }

    record.count++;

    // 设置速率限制响应头
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}

// 全局 API 限制：每个 IP 每分钟 100 次
var apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: '请求过于频繁，请稍后再试'
});

// 登录接口限制：每个 IP 每 15 分钟最多 10 次
var loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: '登录尝试过于频繁，请 15 分钟后再试'
});

// 密码重置限制：每个 IP 每 15 分钟最多 5 次
var passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: '密码重置请求过于频繁，请稍后再试'
});

module.exports = { apiLimiter, loginLimiter, passwordResetLimiter };
