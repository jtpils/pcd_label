import random
import string

import cherrypy
import os
import json
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('./'))


extract_object_exe = "~/code/pcltest/build/extract_object"
registration_exe = "~/code/go_icp_pcl/build/test_go_icp"


class Root(object):
    @cherrypy.expose
    def index(self):
      tmpl = env.get_template('index.html')
      return tmpl.render()
  
    @cherrypy.expose
    def ml(self):
      tmpl = env.get_template('test_ml.html')
      return tmpl.render()
  
    @cherrypy.expose
    def reg(self):
      tmpl = env.get_template('registration_demo.html')
      return tmpl.render()

    @cherrypy.expose
    def view(self, file):
      tmpl = env.get_template('view.html')
      return tmpl.render()
          
    @cherrypy.expose
    def save(self, scene, frame):
      cl = cherrypy.request.headers['Content-Length']
      rawbody = cherrypy.request.body.read(int(cl))
      print(rawbody)
      with open("./public/data/"+scene +"/bbox.json/"+frame+".bbox.json",'w') as f:
        f.write(rawbody)
      
      return "ok"

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def load_annotation(self, scene, frame):
      filename = "./public/data/"+scene +"/bbox.json/"+ frame + ".bbox.json"
      if (os.path.isfile(filename)):
        with open(filename,"r") as f:
          ann=json.load(f)
          print(ann)          
          return ann
      else:
        return []

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def auto_adjust(self, scene, ref_frame, object_id, adj_frame):
      
      #os.chdir("./temp")
      os.system("rm ./temp/src.pcd ./temp/tgt.pcd ./temp/out.pcd ./temp/trans.json")


      tgt_pcd_file = "./public/data/"+scene +"/pcd/"+ref_frame+".pcd"
      tgt_json_file = "./public/data/"+scene +"/bbox.json/"+ref_frame+".bbox.json"

      src_pcd_file = "./public/data/"+scene +"/pcd/"+adj_frame+".pcd"      
      src_json_file = "./public/data/"+scene +"/bbox.json/"+adj_frame+".bbox.json"

      cmd = extract_object_exe +" "+ src_pcd_file + " " + src_json_file + " " + object_id + " " +"./temp/src.pcd"
      print(cmd)
      os.system(cmd)

      cmd = extract_object_exe + " "+ tgt_pcd_file + " " + tgt_json_file + " " + object_id + " " +"./temp/tgt.pcd"
      print(cmd)
      os.system(cmd)

      cmd = registration_exe + " ./temp/tgt.pcd ./temp/src.pcd ./temp/out.pcd ./temp/trans.json"
      print(cmd)
      os.system(cmd)

      with open("./temp/trans.json", "r") as f:
        trans = json.load(f)
        print(trans)
        return trans

      return {}

    @cherrypy.expose    
    @cherrypy.tools.json_out()
    def datameta(self):
      data = []

      scenes = os.listdir("./public/data")
      print(scenes)

      for s in scenes:
        scene = {
          "scene": s,
          "frames": []
        }

        if os.path.exists(os.path.join("public/data", s, "disable")):
          print(s, "disabled")
          continue
        
        data.append(scene)

        frames = os.listdir("public/data/"+s+"/pcd")
        print(s, frames)
        frames.sort()
        for f in frames:
          if os.path.isfile("public/data/"+s+"/pcd/"+f):
            filename, fileext = os.path.splitext(f)
            scene["frames"].append(filename)

        point_transform_matrix=[]

        if os.path.isfile("public/data/"+s+"/point_transform.txt"):
          with open("public/data/"+s+"/point_transform.txt")  as f:
            point_transform_matrix=f.read()
            point_transform_matrix = point_transform_matrix.split(",")

        def strip_str(x):
          return x.strip()

        calib={}
        if os.path.isfile("public/data/"+s+"/calib.txt"):
          with open("public/data/"+s+"/calib.txt")  as f:
            lines = f.readlines()
            calib["extrinsic"] = map(strip_str, lines[0].strip().split(","))
            calib["intrinsic"] = lines[1].strip().split(",")            

        if not os.path.isdir("public/data/"+s+"/bbox.xyz"):
          scene["boxtype"] = "psr"
          if point_transform_matrix:
            scene["point_transform_matrix"] = point_transform_matrix
          if calib:
            scene["calib"] = calib
        else:
          scene["boxtype"] = "xyz"
          if point_transform_matrix:
            scene["point_transform_matrix"] = point_transform_matrix
          if calib:
            scene["calib"] = calib

      print(data)
      return data
      # return [
      #         {
      #           "scene":"liuxian1",
      #           "frames": [
      #             "000242","000441"
      #           ],
      #           "boxtype":"xyz",
      #           "point_transform_matrix": [
      #             1, 0, 0, 
      #             0, 0, 1, 
      #             0, -1, 0,
      #           ]
      #         },
      #         {
      #           "scene":"liuxian2",
      #           "frames": [
      #             "test"
      #           ],
      #           "boxtype":"psr",
      #         },
      #        ]

if __name__ == '__main__':
  cherrypy.quickstart(Root(), '/', config="server.conf")

