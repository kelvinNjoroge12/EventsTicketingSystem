import urllib.parse
password = urllib.parse.unquote("KeNyA%400%23015")
print("Password is:", password)
try:
    import psycopg
    print("Connecting...")
    conn = psycopg.connect(
        host="aws-1-eu-west-1.pooler.supabase.com",
        port=5432,
        user="postgres.cyrwfnkatnqtfasqsoau",
        password=password,
        dbname="postgres",
        sslmode="require",
        connect_timeout=10
    )
    print("Connected!")
    conn.close()
except Exception as e:
    print("Error:", type(e), e)
