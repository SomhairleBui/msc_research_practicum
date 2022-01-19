## COMP47360 Research Practicum Project 2021

This repository contains the source code for the *COMP47360 Research Practicum Project* of Team 16.

The configuration and install instructions are available in the following wiki pages:

**Configuration**
### Install NodeJS

The React application requires NodeJS. 

[https://nodejs.org/en/download/](https://nodejs.org/en/download/)

Note: A "getting started" version of React can be installed with:

 `npx create-react-app frontend`

### Install dependencies

 `cd /dublin-bus/dublin_bus_project/frontend`
 
 `npm install`

### Add Google API Key to `config.js`

```
const API_URL = 'http://localhost:8000'
const GOOGLE_API_KEY = 'API Key'

export {
    API_URL, GOOGLE_API_KEY
}
```

### Enable the following Google Services

- Directions API

- Maps JavaScript API

- Geocoding API

- Places API

### Start the local React server

`npm start run`

The App is visible on the following url:

[http://localhost:3000/static/react](http://localhost:3000/static/react)

### Start the Django server

`python manage.py runserver`

## Deployment

Connect to the server.

### Check the `.env` file for the build configuration

```
# this is the output folder of the react application (npm run build)
BUILD_PATH='../static/react/'

# react generates an index.html file in the static/react folder
# the href, src path will be set in the index.html file to this:
PUBLIC_URL=http://127.0.0.1:8000/static/react/
```


### Build the React App

`npm run build`

Django Installation and Brief guide
Cloning the GitLab

$git clone https://csgitlab.ucd.ie/ucd-research-practicum/dublin-bus.git enter account username & password

Installing Django:

Create a new Virtual enviroment(Python 3.8) (Not needed but helps keep things tidy) Activate the enviroment $pip install django (python -m django --version should read 3.2.4)

Running the site:

Navigate to the dublin_bus_project directory and run: $python manage.py runserver

terminal will show the url the server is running on (Default localhost: 127.0.0.1:8000) Changes to the html file should show when the page is refreshed but if not restart the server.

In a second terminal also run: $python manage.py gtfs-r

This consumes the GTFS-R feed, modifies the timetable and store the result in a model/DB.

If not previously run, it may be necessary to run: $python manage.py migrate

** IF above not working**

Delete your database (db.sqlite3 in my case) in your project directory
Remove everything from pycache folder under your project subdirectory
go to the project folder and clear migrations and pycache directories When you are sure you have cleared all the above files, run:
python manage.py makemigrations python manage.py migrate --run --syncdb

Adding a new page:

Add the html file to the templates/dublin_bus_app folder
create function in dublin_bus_app/views.py example def functionname(request) return render(request,"dublin_bus_app/yourpage.html") 3.add url to dublin_bus_app/urls.py path("UrlPath",views.functionname,name="nameit")
Adding CSS:

Add css file to dublin_bus_app/static/css
Add the stylesheet to html page: Add in the head: {% load static %} -> tag that lets Django look in the static folder
Static url replaces regular href

Adding Images:

Add in the load static tag {% load static %} (Once per Page) <img src="{% static 'images/yourImage.png' %}"

Adding Javascript:

Add JS file to dublin_bus_app/static/js
Add the Load static tag Example of linking javascript is below

**Project Deployment**
Tutorial: [link](https://www.digitalocean.com/community/tutorials/how-to-set-up-django-with-postgres-nginx-and-gunicorn-on-ubuntu-16-04)


### Clone from repository:

`git clone https://csgitlab.ucd.ie/ucd-research-practicum/dublin-bus.git`


### Create and activate virtual environment:

`python3 -m venv dublin-bus-env`

`. dublin-bus-env/bin/activate`


### Install requirements:

`cd dublin-bus`

`pip install -r requirements.txt`


### Create `dbinfo.py` file:

`nano dublin-bus/dublin_bus_project/dublin_bus_app/dbinfo.py`

```
google_key='insert Google API key here'
```


### Update Django `settings.py` file:

```
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'dublin-bus-db-name',
        'USER': 'the-db-username',
        'PASSWORD': 'the-db-password',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
```


### Create database tables:

`cd dublin-bus/dublin_bus_project/`

`python manage.py makemigrations`

`python manage.py migrate` or `python manage.py migrate --run-syncdb`


### Run management scripts:

`nohoup python manage.py gtfs-r`

`python manage.py tourism`


### Build Frontend:

`cd dublin-bus/dublin_bus_project/frontend`

`npm install`

`npm run build`


### Test Gunicorn:

`gunicorn --bind 0.0.0.0:80 --chdir dublin_bus_project --workers 3 dublin_bus_project.wsgi:application`


### Install Nginx:

`sudo apt install nginx`

`systemctl status nginx`


### Configure Nginx to Proxy Pass to Gunicorn:

`sudo nano /etc/nginx/sites-available/dublin-bus`

```
server {
    listen 80;
    server_name ~^(.+)$;
    
    location /static/ {
        root /home/student/dublin-bus/dublin_bus_project/dublin_bus_app;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/home/student/dublin_bus.sock;
    }
}
```

### Enable the configuration:

`sudo ln -s /etc/nginx/sites-available/dublin-bus /etc/nginx/sites-enabled`

`sudo systemctl restart nginx`

### Run Gunicorn to test:

`cd dublin-bus`

`gunicorn --bind unix:/home/student/dublin_bus.sock --chdir dublin_bus_project --workers 3 dublin_bus_project.wsgi:application`

### Set up Gunicorn as a Service:

`sudo nano /etc/systemd/system/gunicorn.service`

```
[Unit]
Description=gunicorn daemon
After=network.target
StartLimitIntervalSec=500
StartLimitBurst=5

[Service]
User=student
Restart=on-failure
RestartSec=5s

WorkingDirectory=/home/student/dublin-bus/dublin_bus_project
ExecStart=/home/student/dublin-bus-env/bin/gunicorn/gunicorn --workers 3 --bind unix:/home/student/dublin_bus.sock dublin_bus_project.wsgi:application

[Install]
WantedBy=multi-user.target
```

### Enable and start the Gunicorn service:

`sudo systemctl enable /etc/systemd/system/gunicorn.service`

`sudo systemctl start gunicorn`


### Gunicorn service logs:

`sudo journalctl -u gunicorn`


### Check Gunicorn service status:

`sudo systemctl status gunicorn`


### Set up GTFS as a Service:

`sudo nano /etc/systemd/system/gtfs.service`

```
[Unit]
Description=gtfs
After=network.target
StartLimitIntervalSec=500
StartLimitBurst=5

[Service]
User=student
Restart=on-failure
RestartSec=5s

WorkingDirectory=/home/student/dublin-bus/dublin_bus_project
ExecStart=/home/student/dublin-bus-env/bin/python -u manage.py gtfs-r

[Install]
WantedBy=multi-user.target
```

### Enable and start the GTFS service:

`sudo systemctl enable /etc/systemd/system/gtfs.service`

`sudo systemctl start gtfs`


### GTFS service logs:

`sudo journalctl -u gtfs`


### Check GTFS service status:

`sudo systemctl status gtfs`


### Update project:

`sudo systemctl stop gtfs`

`sudo systemctl stop gunicorn`

`cd dublin-bus`

`git pull`

`sudo systemctl start gtfs`

`sudo systemctl start gunicorn`
**Optional Deployment**
The Dublin Bus Project and the MySQL Database can run in separate Docker containers on the same server.

**Key point about Docker:**
  
- Used to run multiple programs on the same server:
	- One container has the MySQL server
	- Another container has the Django project

## Docker Setup

### Install Instructions

[https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)

#### Ubuntu server

Install Docker:

`sudo apt update`

`sudo apt install docker docker-compose`

Add user to Docker group:

`sudo groupadd docker`

`sudo usermod -aG docker $USER`


## Setting up a MySQL Container

1) Get the MySQL image from [https://hub.docker.com/_/mysql](https://hub.docker.com/_/mysql)

`docker pull mysql`

2) Create a database folder to store the database:

`cd ~`

`mkdir database`

3) Run the MySQL image:

`docker run --name mysql-container -v /database:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=the-password -p 3306:3306 -d mysql:latest`

- run the `mysql:latest` image in a container with name set to `mysql-container`
- the DB root user password is set to `the-password` (use the real password here)
- the DB folder is set to `database`
- open port `3306`

Connect to the `mysql-container` for testing:

`docker exec -it mysql-container mysql -uroot -p`

## Setting up the Project Container

1) Clone from GitLab

`git clone https://csgitlab.ucd.ie/ucd-research-practicum/dublin-bus.git`

2) Create the Dockerfile:

`cd dublin-bus`

`nano Dockerfile`

The Dockerfile content:

```
# syntax=docker/dockerfile:1
FROM python:3
ENV PYTHONUNBUFFERED=1
WORKDIR /code
COPY requirements.txt /code/
RUN pip install -r requirements.txt
COPY . /code/
EXPOSE 80
CMD ["python", "dublin_bus_project/manage.py", "runserver", "80"]
```

3) Build the Docker Image from the Dockerfile:

`docker build -t django-image:v1 .`

4) Run the Container:

`docker run --name django-container -p 80:80 django-image:v1`
**Connecting to the Database**
**UCD Ubuntu Virtual Machine**
- mysql -u root -p

Enter the password I dm'd you on discord

**MYSQL Workbench on your own Machine:**
- Create new connection
- Name whatever you like
- Hostname: csi420-02-vm5.ucd.ie
- Port: 80
- Username: team16
- Password: Same password as VM, was DM'd to you (if in workbench, store in vault to not re-enter it every time)

**Testing**
Testing for the backend functionality can be carried out by navigating to the dublin_bus_project directory and running

**python manage.py test**

in a terminal

This command then runs the 5 testing py files in the tests folder: These are

test_commands.py.
- test_routes, tests that routes command runs correctly
- test_today, tests that the today command runs correctly

test_models.py tests that the models function correctly
- test_today_insert : Tests that an object can be inserted and retrieved from the Tests model
- test_times_insert : tests that an object can be inserted and retrieved from the Times Model

test_urls.py: Tests that the urls are resolved to the correct function in views
- test_routes_url_is_resolved
- test_route_list_url_is_resolved
- test_real_time_url_is_resolved
- test_stops_url_is_resolved
- test_predict_url_is_resolved

test_utils.py: Tests that the util functions are connected and working correctly
- test_hps_connection: Tests that the application is able to connect to the UCD HPS
- test_mysql_connection: Tests that the application is able to connect to the mysql database on the HPS
- test_weather_getter: Tests that the weather getter function is working
- test_stop_and_hop: Tests that the stop_and_hops function is working correctly

test_views.py: Tests that the views are functional
- test_routes_return: Tests that the routes view returns a JSON object (with value)
- test_route_list_return: Tests that the route_list view returns a JSON object (with Value)
- test_timetable_return_key_error: Tests that the timetable returns an empty JSON in the event of a key error
