from sshtunnel import SSHTunnelForwarder
import mysql.connector
import json

# from .dbinfo import *



sql_hostname = '127.0.0.1'
sql_username = 'team16'
sql_password = '6pT7xqWF3VK68fmP'
sql_main_database = 'team16'
sql_port = 3306
ssh_host = 'telemachus.ucd.ie'
ssh_user = 'team16'
ssh_password='$Y_md3=FEyz{b~+;'
ssh_port = 22
sql_ip = '1.1.1.1.1'


#Open the SSH tunnel (Connects to the HPS)
server = SSHTunnelForwarder(
            (ssh_host,22),
            ssh_username= ssh_user,
            ssh_password= ssh_password,
            remote_bind_address=('127.0.0.1', 3306))

server.start()
print(server.local_bind_port)

# Connect to the Database (via the SSH)
cnx = mysql.connector.connect(user=ssh_user, password=sql_password,
                              host=sql_hostname,
                              database=ssh_user,
                              charset='utf8',
                              use_unicode='FALSE',
                              port = server.local_bind_port)



cursor=cnx.cursor(dictionary=True)

query= "SELECT * from current_weather ORDER BY dt DESC LIMIT 1;"

cursor.execute(query)

current_weather = cursor.fetchall()[0]

current_weather = json.dumps(current_weather, indent=4,default=str)

print(current_weather)

cursor.close()

cnx.close()

server.stop()