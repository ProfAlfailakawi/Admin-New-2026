cd /tmp/claude-0/s; node adm2.mjs
A="http://localhost:3104/?demo=1&page"
node sweep2.mjs a2/ad light reduce "dash|$A=dashboard" "orders|$A=orders" "cust|$A=customers" "rep|$A=reports" "set|$A=settings" "sup|$A=suppliers" "exp|$A=expenses" "prod|$A=products" | tr '\n' ' '
