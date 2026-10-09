"""Refresh public, aggregate BUSearch usage figures from local Rybbit (read-only)."""
import datetime as dt
import json
from pathlib import Path
import subprocess
from zoneinfo import ZoneInfo

end = dt.datetime.now(ZoneInfo('Europe/Warsaw')).date()
start = end - dt.timedelta(days=30)
where = f"""site_id = 3 AND hostname = 'busearch.pl'
AND timestamp >= toDateTime('{start} 00:00:00', 'Europe/Warsaw')
AND timestamp < toDateTime('{end} 00:00:00', 'Europe/Warsaw')"""

def query(sql):
    result = subprocess.run(['docker', 'exec', 'rybbit-clickhouse', 'clickhouse-client',
                             '--query', sql + ' FORMAT JSON'], check=True,
                            capture_output=True, text=True)
    return json.loads(result.stdout)['data']

daily = query(f"""SELECT toDate(timestamp, 'Europe/Warsaw') AS day,
uniqExactIf(user_id, user_id != '') AS visitors
FROM analytics.events WHERE {where} GROUP BY day ORDER BY day""")
if len(daily) != 30:
    raise SystemExit('Expected 30 complete days; previous published figures were kept.')
totals = query(f"""SELECT countIf(type = 'pageview') AS pageviews,
uniqExactIf(session_id, session_id != '') AS sessions,
round(100.0 * countIf(type = 'pageview' AND device_type = 'Mobile') /
countIf(type = 'pageview'), 1) AS mobilePageviewsPercent
FROM analytics.events WHERE {where}""")[0]
output = {
    'source': 'Rybbit', 'hostname': 'busearch.pl', 'timezone': 'Europe/Warsaw',
    'periodStart': str(start), 'periodEnd': str(end - dt.timedelta(days=1)),
    'generatedOn': str(end), 'days': 30,
    'averageDailyVisitors': round(sum(int(row['visitors']) for row in daily) / 30),
    'peakDailyVisitors': max(int(row['visitors']) for row in daily),
    'sessions': int(totals['sessions']), 'pageviews': int(totals['pageviews']),
    'mobilePageviewsPercent': totals['mobilePageviewsPercent'], 'daily': daily,
}
path = Path(__file__).resolve().parents[1] / 'src/pages/home-usage.json'
path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
print(f"Updated aggregate usage for {start}–{end - dt.timedelta(days=1)}")
