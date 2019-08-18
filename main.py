import random
import string

import cherrypy
import os

from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('./'))




class Root(object):
    @cherrypy.expose
    def index(self):
      tmpl = env.get_template('index.html')
      return tmpl.render()
    
    @cherrypy.expose
    def save(self, frame):
      cl = cherrypy.request.headers['Content-Length']
      rawbody = cherrypy.request.body.read(int(cl))
      print(rawbody)
      with open(frame+".anno.txt",'w') as f:
        f.write(rawbody)
      
      return "ok"

    @cherrypy.expose    
    def load(self, frame):
      with open("./public/"+frame,"r") as f:
        y=f.read()
        return y
    

if __name__ == '__main__':
  cherrypy.quickstart(Root(), '/', config="server.conf")

