from sshtunnel import SSHTunnelForwarder
import mysql.connector
import json

# from .dbinfo import *



sql_hostname = ''
sql_username = ''
sql_password = ''
sql_main_database = ''
sql_port = 
ssh_host = ''
ssh_user = ''
ssh_password=''
ssh_port = 
sql_ip = ''


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
