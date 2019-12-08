
import {data} from "./data.js"
import {params, selected_box, select_bbox } from "./main.js"
import {vector4to3, vector3_nomalize, psr_to_xyz, matmul} from "./util.js"
import {get_obj_cfg_by_type} from "./obj_cfg.js"


var drawing = false;
var points = [];
var polyline;
var top_is_temp = false;

var all_lines=[];

function to_polyline_attr(points){
    return points.reduce(function(x,y){
        return String(x)+","+y;
    }
    )
}

function init_image_op(){
    var c = document.getElementById("maincanvas-wrapper");
    c.onclick = on_click;

    // var h = document.getElementById("resize-handle");
    // h.onmousedown = resize_mouse_down;
    
    c.onresize = on_resize;
}

function on_resize(ev){
    console.log(ev);
}


function to_viewbox_coord(x,y){
    var div = document.getElementById("maincanvas-svg");
    
    x = Math.round(x*2048/div.clientWidth);
    y = Math.round(y*1536/div.clientHeight);
    return [x,y];

}
function on_click(e){
    var p= to_viewbox_coord(e.layerX, e.layerY);
    var x=p[0];
    var y=p[1];
    console.log(x,y);
    
    if (!drawing){
        drawing = true;
        var svg = document.getElementById("maincanvas-svg");
        //svg.style.position = "absolute";
        
        polyline = document.createElementNS("http://www.w3.org/2000/svg", 'polyline');
        svg.appendChild(polyline);
        points.push(x);
        points.push(y);

        
        polyline.setAttribute("class", "maincanvas-line")
        polyline.setAttribute("points", to_polyline_attr(points));

        var c = document.getElementById("maincanvas-wrapper");
        c.onmousemove = on_move;
        c.ondblclick = on_dblclick;   
        c.onkeydown = on_key;    
        
        

    } else {
        if (points[points.length-2]!=x || points[points.length-1]!=y){
            points.push(x);
            points.push(y);
            polyline.setAttribute("points", to_polyline_attr(points));
        }
        
    }


    function on_move(e){
        var p= to_viewbox_coord(e.layerX, e.layerY);
        var x=p[0];
        var y=p[1];

        console.log(x,y);
        polyline.setAttribute("points", to_polyline_attr(points) + ',' + x + ',' + y);
    }

    function on_dblclick(e){
        
        points.push(points[0]);
        points.push(points[1]);
        
        polyline.setAttribute("points", to_polyline_attr(points));
        console.log(points)
        
        all_lines.push(points);

        drawing = false;
        points = [];

        var c = document.getElementById("maincanvas-wrapper");
        c.onmousemove = null;
        c.ondblclick = null;
        c.onkeypress = null;
        c.blur();
    }

    function cancel(){
            
            polyline.remove();

            drawing = false;
            points = [];
            var c = document.getElementById("maincanvas-wrapper");
            c.onmousemove = null;
            c.ondblclick = null;
            c.onkeypress = null;

            c.blur();
    }

    function on_key(e){
        if (e.key == "Escape"){
            cancel();
            
        }
    }
}


function on_mouse_down(e){
    //e.stopPropagation();
    //e.preventDefault();
    
    
}

// all boxes
function clear_main_canvas(){

    //var c = document.getElementById("maincanvas");
    //var ctx = c.getContext("2d");
                
    //ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    var boxes = document.getElementById("svg-boxes").children;
    
    if (boxes.length>0){
        for (var c=boxes.length-1; c >= 0; c--){
            boxes[c].remove();                    
        }
    }
}

function set_camera(name){
    data.set_active_image(camera_name);
}


function get_active_calib(){
    var scene_meta = data.meta.find(function(x){return x.scene==data.world.file_info.scene;});

        
    if (!scene_meta.calib){
        return null;
    }

    var active_image_name = data.world.images.active_name;
    var calib = scene_meta.calib[active_image_name];

    return calib;
}


function choose_best_camera_for_point(x,y,z){
    var scene_meta = data.meta.find(function(x){return x.scene==data.world.file_info.scene;});

        
    if (!scene_meta.calib){
        return null;
    }

    var proj_pos = [];
    for (var i in scene_meta.calib){
        var imgpos = matmul(scene_meta.calib[i].extrinsic, [x,y,z,1], 4);
        proj_pos.push({calib: i, pos: vector4to3(imgpos)});
    }

    var valid_proj_pos = proj_pos.filter(function(p){
        return all_points_in_image_range(p.pos);
    });
    
    valid_proj_pos.forEach(function(p){
        p.dist_to_center = p.pos[0]*p.pos[0] + p.pos[1]*p.pos[1];
    });

    valid_proj_pos.sort(function(x,y){
        return x.dist_to_center - y.dist_to_center;
    });

    console.log(valid_proj_pos);

    if (valid_proj_pos.length>0){
        return valid_proj_pos[0].calib;
    }

    return null;

}

function get_trans_ratio(){
    var img = data.world.images.active_image();       

    if (!img || img.width==0){
        return null;
    }

    var clientWidth, clientHeight;

    clientWidth = 2048;
    clientHeight = 1536;

    var trans_ratio ={
        x: clientWidth/img.naturalWidth,
        y: clientHeight/img.naturalHeight,
    };

    return trans_ratio;
}

function show_image(){
    var svgimage = document.getElementById("svg-image");

    // active img is set by global, it's not set sometimes.
    var img = data.world.images.active_image();
    if (img)
        svgimage.setAttribute("xlink:href", img.src);
}


function render_2d_image(){
    console.log("2d iamge rendered!");

    clear_main_canvas();

    if (params["hide image"]){
        hide_canvas();
        return;
    }

    show_image();

    draw_svg();

    function hide_canvas(){
        //document.getElementsByClassName("ui-wrapper")[0].style.display="none";
        //document.getElementById("maincanvas-wrapper").style.display="none";
    }

    function show_canvas(){
        document.getElementById("maincanvas-wrapper").style.display="inherit";
    }



    function draw_canvas(){
        // draw picture
        //var c = document.getElementById("maincanvas");
        var c = document.getElementById("svg-canvas");
        var ctx = c.getContext("2d");

        var img = data.world.images.active_image();
       

        if (!img || img.width==0){
            hide_canvas();
            return;
        }

        show_canvas();

        var clientWidth, clientHeight;
        // adjust canvas width/height
        /*
        if (img.naturalWidth / img.naturalHeight > ctx.canvas.width, ctx.canvas.height){
            clientWidth = ctx.canvas.width;
            clientHeight = ctx.canvas.width * img.naturalHeight/img.naturalWidth;
        }else{
            clientHeight = ctx.canvas.height;
            clientWidth = ctx.canvas.height * img.naturalWidth/img.naturalHeight;
        }

        
        */

        clientWidth = ctx.canvas.width;
        clientHeight = ctx.canvas.height;

        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, clientWidth, clientHeight);

        //var trans_ratio = ctx.canvas.width/img.naturalWidth;
        var trans_ratio ={
            x: clientWidth/img.naturalWidth,
            y: clientHeight/img.naturalHeight,
        };

        var calib = get_active_calib();
        if (!calib){
            return;
        }

        // draw boxes
        data.world.boxes.forEach(function(box){
            

            var scale = box.scale;
            var pos = box.position;
            var rotation = box.rotation;

            var box3d = psr_to_xyz(pos, scale, rotation);
            
            var imgpos = matmul(calib.extrinsic, box3d, 4);
            var imgpos3 = vector4to3(imgpos);
            var imgpos2 = matmul(calib.intrinsic, imgpos3, 3);

            if (!all_points_in_image_range(imgpos3)){
                return;
            }
            var imgfinal = vector3_nomalize(imgpos2);

            ctx.lineWidth = 2;
            // front 
            draw_box_on_image(ctx, box, imgfinal, trans_ratio, selected_box == box);

        });

        // draw points 
        if (true){

            
           
            var canvasData = ctx.getImageData(0, 0, clientWidth, clientHeight);

            // That's how you define the value of a pixel //
            function drawPixel (x, y, r, g, b, a) {
                var index = (x + y * clientWidth) * 4;

                canvasData.data[index + 0] = r;
                canvasData.data[index + 1] = g;
                canvasData.data[index + 2] = b;
                canvasData.data[index + 3] = a;
            }

            // That's how you update the canvas, so that your //
            // modification are taken in consideration //
            function updateCanvas() {
                ctx.putImageData(canvasData, 0, 0);
            }

            var pts = data.world.get_points();
            var p = pts.position.array;
            var c = pts.color.array;
            var p_homo = [];
            for (var i=0; i<pts.position.count; ++i){
                p_homo.push(p[i*3]);
                p_homo.push(p[i*3+1]);
                p_homo.push(p[i*3+2]);
                p_homo.push(1);
            }

            var imgpos = matmul(calib.extrinsic, p_homo, 4);
            var imgpos3 = vector4to3(imgpos);

            var imgpos3_in_range = [];
            var color=[];
            for (var i = 0; i<imgpos3.length/3; ++i){
                if (imgpos3[i*3+2] <-1){

                }
                else{
                    imgpos3_in_range.push(imgpos3[i*3]);
                    imgpos3_in_range.push(imgpos3[i*3+1]);
                    imgpos3_in_range.push(imgpos3[i*3+2]);
                    color.push(c[i*3]);
                    color.push(c[i*3+1]);
                    color.push(c[i*3+2]);
                }
            }

            var imgpos2 = matmul(calib.intrinsic, imgpos3_in_range, 3);
            var imgfinal = vector3_nomalize(imgpos2);

            
            for (var i = 0; i<imgfinal.length/2; ++i){
                /*
                var x = Math.round(imgfinal[i*2]*trans_ratio.x); 
                var y = Math.round(imgfinal[i*2+1]*trans_ratio.y);
                var r = Math.round(color[i*3]*255); 
                var g = Math.round(color[i*3+1]*255); 
                var b = Math.round(color[i*3+2]*255);
                var a = Math.round(0.5*255);
                
                
                drawPixel(x-1,y,r,g,b,a);
                drawPixel(x+1,y,r,g,b,a);
                drawPixel(x,  y,r,g,b,a);

                drawPixel(x-1,y-1,r,g,b,a);
                drawPixel(x+1,y-1,r,g,b,a);
                drawPixel(x,  y-1,r,g,b,a);

                drawPixel(x-1,y+1,r,g,b,a);
                drawPixel(x+1,y+1,r,g,b,a);
                drawPixel(x,  y+1,r,g,b,a);
                */

                
               ctx.fillStyle="rgba("+Math.round(color[i*3]*255)+","+
                                     Math.round(color[i*3+1]*255)+","+
                                     Math.round(color[i*3+2]*255)+","+
                                     0.5+")";
               ctx.fillRect(Math.round(imgfinal[i*2]*trans_ratio.x)-3,Math.round(imgfinal[i*2+1]*trans_ratio.y)-3,5,5); // fill in the pixel at (10,10)
               
            }

            //updateCanvas();
        }
    }

    function draw_svg(){
        // draw picture
        var img = data.world.images.active_image();       

        if (!img || img.width==0){
            hide_canvas();
            return;
        }

        show_canvas();

        var trans_ratio = get_trans_ratio();

        var calib = get_active_calib();
        if (!calib){
            return;
        }

        var svg = document.getElementById("svg-boxes");

        // draw boxes
        data.world.boxes.forEach(function(box){
            var imgfinal = box_to_2d_points(box, calib);
            if (imgfinal){
                var box_svg = box_to_svg(box, imgfinal, trans_ratio, selected_box == box);
                svg.appendChild(box_svg);
            }

        });


    }

}

function box_to_2d_points(box, calib){
    var scale = box.scale;
    var pos = box.position;
    var rotation = box.rotation;

    var box3d = psr_to_xyz(pos, scale, rotation);
    
    var imgpos = matmul(calib.extrinsic, box3d, 4);
    var imgpos3 = vector4to3(imgpos);
    var imgpos2 = matmul(calib.intrinsic, imgpos3, 3);

    if (!all_points_in_image_range(imgpos3)){
        return null;
    }
    var imgfinal = vector3_nomalize(imgpos2);

    return imgfinal;
}

function box_to_svg(box, box_corners, trans_ratio, selected){
    

    var imgfinal = box_corners.map(function(x, i){
        if (i%2==0){
            return Math.round(x * trans_ratio.x);
        }else {
            return Math.round(x * trans_ratio.y);
        }
    })


    var svg = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    svg.setAttribute("id", "svg-box-local-"+box.obj_local_id);

    if (selected){
        svg.setAttribute("class", "box-svg-selected");
    }

    var front_panel =  document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
    svg.appendChild(front_panel);
    front_panel.setAttribute("points",
        imgfinal.slice(0, 4*2).reduce(function(x,y){            
            return String(x)+","+y;
        })
    )

    /*
    var back_panel =  document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
    svg.appendChild(back_panel);
    back_panel.setAttribute("points",
        imgfinal.slice(4*2).reduce(function(x,y){            
            return String(x)+","+y;
        })
    )
    */

   for (var i = 0; i<4; ++i){
        var line =  document.createElementNS("http://www.w3.org/2000/svg", 'line');
        svg.appendChild(line);
        line.setAttribute("x1", imgfinal[(4+i)*2]);
        line.setAttribute("y1", imgfinal[(4+i)*2+1]);
        line.setAttribute("x2", imgfinal[(4+(i+1)%4)*2]);
        line.setAttribute("y2", imgfinal[(4+(i+1)%4)*2+1]);
    }


    for (var i = 0; i<4; ++i){
        var line =  document.createElementNS("http://www.w3.org/2000/svg", 'line');
        svg.appendChild(line);
        line.setAttribute("x1", imgfinal[i*2]);
        line.setAttribute("y1", imgfinal[i*2+1]);
        line.setAttribute("x2", imgfinal[(i+4)*2]);
        line.setAttribute("y2", imgfinal[(i+4)*2+1]);
    }

    return svg;
}


function draw_box_on_image(ctx, box, box_corners, trans_ratio, selected){
    var imgfinal = box_corners;

    if (!selected){
        ctx.strokeStyle = get_obj_cfg_by_type(box.obj_type).color;

        var c = get_obj_cfg_by_type(box.obj_type).color;
        var r ="0x"+c.slice(1,3);
        var g ="0x"+c.slice(3,5);
        var b ="0x"+c.slice(5,7);

        ctx.fillStyle="rgba("+parseInt(r)+","+parseInt(g)+","+parseInt(b)+",0.2)";
    }
    else{
        ctx.strokeStyle="#ff00ff";        
        ctx.fillStyle="rgba(255,0,255,0.2)";
    }

    // front panel
    ctx.beginPath();
    ctx.moveTo(imgfinal[3*2]*trans_ratio.x,imgfinal[3*2+1]*trans_ratio.y);

    for (var i=0; i < imgfinal.length/2/2; i++)
    {
        ctx.lineTo(imgfinal[i*2+0]*trans_ratio.x, imgfinal[i*2+1]*trans_ratio.y);
    }

    ctx.closePath();
    ctx.fill();
    
    // frame
    ctx.beginPath();

    ctx.moveTo(imgfinal[3*2]*trans_ratio.x,imgfinal[3*2+1]*trans_ratio.y);

    for (var i=0; i < imgfinal.length/2/2; i++)
    {
        ctx.lineTo(imgfinal[i*2+0]*trans_ratio.x, imgfinal[i*2+1]*trans_ratio.y);
    }
    //ctx.stroke();


    //ctx.strokeStyle="#ff00ff";
    //ctx.beginPath();

    ctx.moveTo(imgfinal[7*2]*trans_ratio.x,imgfinal[7*2+1]*trans_ratio.y);

    for (var i=4; i < imgfinal.length/2; i++)
    {
        ctx.lineTo(imgfinal[i*2+0]*trans_ratio.x, imgfinal[i*2+1]*trans_ratio.y);
    }
    
    ctx.moveTo(imgfinal[0*2]*trans_ratio.x,imgfinal[0*2+1]*trans_ratio.y);
    ctx.lineTo(imgfinal[4*2+0]*trans_ratio.x, imgfinal[4*2+1]*trans_ratio.y);
    ctx.moveTo(imgfinal[1*2]*trans_ratio.x,imgfinal[1*2+1]*trans_ratio.y);
    ctx.lineTo(imgfinal[5*2+0]*trans_ratio.x, imgfinal[5*2+1]*trans_ratio.y);
    ctx.moveTo(imgfinal[2*2]*trans_ratio.x,imgfinal[2*2+1]*trans_ratio.y);
    ctx.lineTo(imgfinal[6*2+0]*trans_ratio.x, imgfinal[6*2+1]*trans_ratio.y);
    ctx.moveTo(imgfinal[3*2]*trans_ratio.x,imgfinal[3*2+1]*trans_ratio.y);
    ctx.lineTo(imgfinal[7*2+0]*trans_ratio.x, imgfinal[7*2+1]*trans_ratio.y);


    ctx.stroke();
}


function clear_canvas(){
    var c = document.getElementById("canvas");
    var ctx = c.getContext("2d");
                
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}



function projected_3d_point_out_of_image_range(p){
    if (p[0]<0 || p[1]<0 || p[2]<0){
        return true;
    }
    else return false;
}

function all_points_in_image_range(p){
    for (var i = 0; i<p.length/3; i++){
        if (p[i*3+2]<0){
            return false;
        }
    }
    
    return true;
}


// draw highlighed box
function update_image_box_projection(box){
    var scene_meta = data.meta.find(function(x){return x.scene==data.world.file_info.scene;});

    var active_image_name = data.world.images.active_name;
    if (!scene_meta.calib){
        return;
    }
    
    var calib = scene_meta.calib[active_image_name]
    if (!calib){
        return;
    }
    
    if (calib){
        var scale = box.scale;
        var pos = box.position;
        var rotation = box.rotation;

        var img = data.world.images.active_image(); //document.getElementById("camera");
        if (img && (img.naturalWidth > 0)){

            clear_canvas();


            var box3d = psr_to_xyz(pos, scale, rotation);

            // project corners to image plane
            var imgpos = matmul(calib.extrinsic, box3d, 4);
            var imgpos3 = vector4to3(imgpos);            

            if (all_points_in_image_range(imgpos3)){  // if projection is out of range of the image, stop drawing.
                var imgpos2 = matmul(calib.intrinsic, imgpos3, 3);
                var imgfinal = vector3_nomalize(imgpos2);

                //console.log(imgfinal);
                
                var c = document.getElementById("canvas");
                var ctx = c.getContext("2d");
                ctx.lineWidth = 0.5;

                // note: 320*240 should be adjustable
                var crop_area = crop_image(img.naturalWidth, img.naturalHeight, ctx.canvas.width, ctx.canvas.height, imgfinal);

                ctx.drawImage(img, crop_area[0], crop_area[1],crop_area[2], crop_area[3], 0, 0, ctx.canvas.width, ctx.canvas.height);// ctx.canvas.clientHeight);
                //ctx.drawImage(img, 0,0,img.naturalWidth, img.naturalHeight, 0, 0, 320, 180);// ctx.canvas.clientHeight);
                var imgfinal = vectorsub(imgfinal, [crop_area[0],crop_area[1]]);
                var trans_ratio = {
                    x: ctx.canvas.height/crop_area[3],
                    y: ctx.canvas.height/crop_area[3],
                }

                draw_box_on_image(ctx, box, imgfinal, trans_ratio, false);
            }
        }
    }
}



function crop_image(imgWidth, imgHeight, clientWidth, clientHeight, corners)
{
    var maxx=0, maxy=0, minx=imgWidth, miny=imgHeight;

    for (var i = 0; i < corners.length/2; i++){
        var x = corners[i*2];
        var y = corners[i*2+1];

        if (x>maxx) maxx=x;
        else if (x<minx) minx=x;

        if (y>maxy) maxy=y;
        else if (y<miny) miny=y;        
    }

    var targetWidth= (maxx-minx)*1.5;
    var targetHeight= (maxy-miny)*1.5;

    if (targetWidth/targetHeight > clientWidth/clientHeight){
        //increate height
        targetHeight = targetWidth*clientHeight/clientWidth;        
    }
    else{
        targetWidth = targetHeight*clientWidth/clientHeight;
    }

    var centerx = (maxx+minx)/2;
    var centery = (maxy+miny)/2;

    return [
        centerx - targetWidth/2,
        centery - targetHeight/2,
        targetWidth,
        targetHeight
    ];
}

function vectorsub(vs, v){
    var ret = [];
    var vl = v.length;

    for (var i = 0; i<vs.length/vl; i++){
        for (var j=0; j<vl; j++)
            ret[i*vl+j] = vs[i*vl+j]-v[j];
    }

    return ret;
}


var image_manager = {
    display_image: function(){
        render_2d_image();
    },

    add_box: function(box){
        var calib = get_active_calib();
        if (!calib){
            return;
        }
        var imgfinal = box_to_2d_points(box, calib);
        if (imgfinal.length>0){
            var trans_ratio = get_trans_ratio();
            var imgfinal = imgfinal.map(function(x, i){
                if (i%2==0){
                    return Math.round(x * trans_ratio.x);
                }else {
                    return Math.round(x * trans_ratio.y);
                }
            })

            var svg_box = box_to_svg(box, imgfinal, trans_ratio);
            var svg = document.getElementById("svg-boxes");
            svg.appendChild(svg_box);
        }
    },


    select_bbox: function(box_obj_local_id){
        var b = document.getElementById("svg-box-local-"+box_obj_local_id);
        if (b)
            b.setAttribute("class", "box-svg-selected");
    },


    unselect_bbox: function(box_obj_local_id){
        var b = document.getElementById("svg-box-local-"+box_obj_local_id);

        if (b)
            b.setAttribute("class", "");
    },

    remove_box: function(box_obj_local_id){
        var b = document.getElementById("svg-box-local-"+box_obj_local_id);

        if (b)
            b.remove();
    },

    update_box: function(box){
        var b = document.getElementById("svg-box-local-"+box.obj_local_id);
        if (!b){
            return;
        }

        var children = b.childNodes;

        var calib = get_active_calib();
        if (!calib){
            return;
        }

        var trans_ratio = get_trans_ratio();
        var imgfinal = box_to_2d_points(box, calib);

        if (!imgfinal){
            //box may go out of image
            return;
        }
        var imgfinal = imgfinal.map(function(x, i){
            if (i%2==0){
                return Math.round(x * trans_ratio.x);
            }else {
                return Math.round(x * trans_ratio.y);
            }
        })

        if (imgfinal){
            var front_panel = children[0];
            front_panel.setAttribute("points",
                imgfinal.slice(0, 4*2).reduce(function(x,y){            
                    return String(x)+","+y;
                })
            )



            for (var i = 0; i<4; ++i){
                var line =  children[1+i];
                line.setAttribute("x1", imgfinal[(4+i)*2]);
                line.setAttribute("y1", imgfinal[(4+i)*2+1]);
                line.setAttribute("x2", imgfinal[(4+(i+1)%4)*2]);
                line.setAttribute("y2", imgfinal[(4+(i+1)%4)*2+1]);
            }


            for (var i = 0; i<4; ++i){
                var line =  children[5+i];
                line.setAttribute("x1", imgfinal[i*2]);
                line.setAttribute("y1", imgfinal[i*2+1]);
                line.setAttribute("x2", imgfinal[(i+4)*2]);
                line.setAttribute("y2", imgfinal[(i+4)*2+1]);
            }
        }

    }
}

export {init_image_op, render_2d_image, update_image_box_projection, clear_canvas, clear_main_canvas, choose_best_camera_for_point, image_manager}