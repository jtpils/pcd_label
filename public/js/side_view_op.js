
import {transform_bbox, selected_box, translate_box, on_box_changed} from "./main.js"
import {data} from "./data.js"
import {views} from "./view.js"
import {matmul2} from "./util.js"


import {
	Quaternion,
	Vector3
} from "./lib/three.module.js";

function create_view_handler(view_prefix, on_edge_changed, on_direction_changed, on_auto_shrink, on_moved){

    var mouse_start_pos;

    var view_handle_dimension = {  //dimension of the enclosed box
        x: 0,  //width
        y: 0,  //height
    }
    
    var view_center = {
        x: 0,
        y: 0,
    };

    var view_port_pos = {
        x:0,
        y:0,
    }

    var lines = {
        top: document.getElementById(view_prefix+"line-top"),
        bottom: document.getElementById(view_prefix+"line-bottom"),
        left: document.getElementById(view_prefix+"line-left"),
        right: document.getElementById(view_prefix+"line-right"),
        direction: document.getElementById(view_prefix+"line-direction"),
    }

    var svg = document.getElementById(view_prefix+"view-svg");
    var div = document.getElementById(view_prefix+"view-manipulator");

    var handles = {
        top: document.getElementById(view_prefix+"line-top-handle"),
        bottom: document.getElementById(view_prefix+"line-bottom-handle"),
        left: document.getElementById(view_prefix+"line-left-handle"),
        right: document.getElementById(view_prefix+"line-right-handle"),
        direction: document.getElementById(view_prefix+"line-direction-handle"),

        topleft: document.getElementById(view_prefix+"top-left-handle"),
        topright: document.getElementById(view_prefix+"top-right-handle"),
        bottomleft: document.getElementById(view_prefix+"bottom-left-handle"),
        bottomright: document.getElementById(view_prefix+"bottom-right-handle"),

        move: document.getElementById(view_prefix+"move-handle"),
    }

    function line(name){
        return lines[name];
    }

    function highlight_lines(lines){
        for (var l in lines){
            lines[l].style.stroke="yellow";
        };
    }

    function hide_lines(lines){
        for (var l in lines){
            lines[l].style.stroke="#00000000";
        }
    };

    function disable_handle_except(exclude){
        for (var h in handles){
            if (handles[h] != exclude)
                handles[h].style.display='none';
        }
    }

    function enable_handles(){
        for (var h in handles){
            handles[h].style.display='inherit';
        }
    }

    function move_lines(delta, direction){
        
        var x1 = view_center.x-view_handle_dimension.x/2;
        var y1 = view_center.y-view_handle_dimension.y/2;
        var x2 = view_center.x+view_handle_dimension.x/2;
        var y2 = view_center.y+view_handle_dimension.y/2;

        if (direction){
            if (direction.x == 1){ //right
                x2 += delta.x;
            } else if (direction.x == -1){ //left
                x1 += delta.x;
            }

            if (direction.y == -1){ //bottom
                y2 += delta.y;
            } else if (direction.y == 1){ //top
                y1 += delta.y;
            }
        } 
        else {
            x1 += delta.x;
            y1 += delta.y;
            x2 += delta.x;
            y2 += delta.y;   
        }

        set_line_pos(Math.ceil(x1),Math.ceil(x2),Math.ceil(y1),Math.ceil(y2));        
    }

    function set_line_pos(x1,x2,y1,y2){
        lines.top.setAttribute("x1", x1);
        lines.top.setAttribute("y1", y1);
        lines.top.setAttribute("x2", x2);
        lines.top.setAttribute("y2", y1);

        lines.bottom.setAttribute("x1", x1);
        lines.bottom.setAttribute("y1", y2);
        lines.bottom.setAttribute("x2", x2);
        lines.bottom.setAttribute("y2", y2);

        lines.left.setAttribute("x1", x1);
        lines.left.setAttribute("y1", y1);
        lines.left.setAttribute("x2", x1);
        lines.left.setAttribute("y2", y2);

        lines.right.setAttribute("x1", x2);
        lines.right.setAttribute("y1", y1);
        lines.right.setAttribute("x2", x2);
        lines.right.setAttribute("y2", y2);
    }

    function rotate_lines(theta){

        console.log(theta);
        theta = -theta-Math.PI/2;
        console.log(theta);
        // we use rotation matrix
        var trans_matrix =[
            Math.cos(theta), Math.sin(theta), view_center.x,
            -Math.sin(theta), Math.cos(theta), view_center.y,
            0, 0, 1,
        ]

        var points =[
            -view_handle_dimension.x/2, view_handle_dimension.x/2,view_handle_dimension.x/2,-view_handle_dimension.x/2, 0,
            -view_handle_dimension.y/2, -view_handle_dimension.y/2,view_handle_dimension.y/2,  view_handle_dimension.y/2, -view_center.y,
            1,1,1,1,1
        ];

        console.log(points);
        var trans_points = matmul2(trans_matrix, points, 3);
        console.log(trans_points);

        lines.direction.setAttribute("x2", Math.ceil(trans_points[4]));
        lines.direction.setAttribute("y2", Math.ceil(trans_points[4+5]));

        lines.top.setAttribute("x1", Math.ceil(trans_points[0]));
        lines.top.setAttribute("y1", Math.ceil(trans_points[0+5]));
        lines.top.setAttribute("x2", Math.ceil(trans_points[1]));
        lines.top.setAttribute("y2", Math.ceil(trans_points[1+5]));

        lines.left.setAttribute("x1", Math.ceil(trans_points[0]));
        lines.left.setAttribute("y1", Math.ceil(trans_points[0+5]));
        lines.left.setAttribute("x2", Math.ceil(trans_points[3]));
        lines.left.setAttribute("y2", Math.ceil(trans_points[3+5]));

        lines.bottom.setAttribute("x1", Math.ceil(trans_points[3]));
        lines.bottom.setAttribute("y1", Math.ceil(trans_points[3+5]));
        lines.bottom.setAttribute("x2", Math.ceil(trans_points[2]));
        lines.bottom.setAttribute("y2", Math.ceil(trans_points[2+5]));

        lines.right.setAttribute("x1", Math.ceil(trans_points[1]));
        lines.right.setAttribute("y1", Math.ceil(trans_points[1+5]));
        lines.right.setAttribute("x2", Math.ceil(trans_points[2]));
        lines.right.setAttribute("y2", Math.ceil(trans_points[2+5]));

    }
    
    function update_view_handle(viewport, obj_dimension){
        var viewport_ratio = viewport.width/viewport.height;
        var box_ratio = obj_dimension.x/obj_dimension.y;
    
        view_port_pos.x = viewport.left;
        view_port_pos.y = viewport.bottom-viewport.height;

        var width=0;
        var height=0;
    
        if (box_ratio > viewport_ratio){
            //handle width is viewport.width*2/3
            width = viewport.width*2/3;
            height = width/box_ratio;
        }
        else{
            //handle height is viewport.height*2/3
            height = viewport.height*2/3;
            width = height*box_ratio;
        }
    
        view_handle_dimension.x = width;
        view_handle_dimension.y = height;
    
        var x = viewport.width/2;//viewport.left + viewport.width/2;
        var y = viewport.height/2//viewport.bottom - viewport.height/2;
    
        var left = x-width/2-1;
        var right = x+width/2-1;
        var top = y-height/2-1;
        var bottom = y+height/2-1;
    
        view_center.x = x-1;
        view_center.y = y-1;
    
        set_line_pos(left, right, top, bottom);    
    
        var de = handles.left;
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', Math.ceil(top+10));
        de.setAttribute('height', Math.ceil(bottom-top-20));
        de.setAttribute('width', 20);

    
        de = handles.right;
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', Math.ceil(top+10));
        de.setAttribute('height', Math.ceil(bottom-top-20));
        de.setAttribute('width', 20);
        
        de = handles.top;
        de.setAttribute('x', Math.ceil(left+10));
        de.setAttribute('y', Math.ceil(top-10));
        de.setAttribute('width', Math.ceil(right-left-20));
        de.setAttribute('height', 20);

        de = handles.bottom;
        de.setAttribute('x', Math.ceil(left+10));
        de.setAttribute('y', Math.ceil(bottom-10));
        de.setAttribute('width', Math.ceil(right-left-20));
        de.setAttribute('height', 20);
    

        de = handles.topleft;
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', Math.ceil(top-10));


        de = handles.topright;
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', Math.ceil(top-10));


        de = handles.bottomleft;
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', Math.ceil(bottom-10));

        de = handles.bottomright;
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', Math.ceil(bottom-10));

        //direction
        if (on_direction_changed){
            de = lines.direction;
            de.setAttribute('x1', Math.ceil((left+right)/2));
            de.setAttribute('y1', Math.ceil((top+bottom)/2));
            de.setAttribute('x2', Math.ceil((left+right)/2));
            de.setAttribute('y2', Math.ceil(0));
        
            de = handles.direction;
            de.setAttribute('x', Math.ceil((left+right)/2-10));
            de.setAttribute('y', 0);//Math.ceil(top+10));    
            de.setAttribute('height', Math.ceil((bottom-top)/2-10+top));
        }
        else{
            de = lines.direction;
            de.style.display = "none";
        
            de = handles.direction;
            de.style.display = "none";
        }


        // move handle
        de = document.getElementById(view_prefix+"move-handle");
        de.setAttribute('x', Math.ceil((left+right)/2-20));
        de.setAttribute('y', Math.ceil((top+bottom)/2-20));
        
    }
    
    
    function init_view_operation(){
        /*
        document.getElementById("z-v-up").onclick = function(){
            transform_bbox("y_move_up");
        };
    
        document.getElementById("z-v-down").onclick = function(){
            transform_bbox("y_move_down");
        };
    
        document.getElementById("z-v-left").onclick = function(){
            transform_bbox("x_move_down");
        };
    
        document.getElementById("z-v-right").onclick = function(){
            transform_bbox("x_move_up");
        };
    
    
    
        document.getElementById("z-v-t-up").onclick = function(){
            transform_bbox("y_scale_up");
        };
    
        document.getElementById("z-v-t-down").onclick = function(){
            transform_bbox("y_scale_down");
        };
    
        document.getElementById("z-v-t-left").onclick = function(){
            transform_bbox("x_scale_down");
        };
    
        document.getElementById("z-v-t-right").onclick = function(){
            transform_bbox("x_scale_up");
        };
        */
    
        div.onkeydown = on_key_down;
        install_edge_hanler(handles.left,   lines,   {x:-1,y:0});
        install_edge_hanler(handles.right,  lines,   {x:1, y:0});
        install_edge_hanler(handles.top,    lines,   {x:0, y:1});
        install_edge_hanler(handles.bottom, lines,   {x:0, y:-1});
        install_edge_hanler(handles.topleft, lines,   {x:-1, y:1});
        install_edge_hanler(handles.topright, lines,   {x:1, y:1});
        install_edge_hanler(handles.bottomleft, lines,   {x:-1, y:-1});
        install_edge_hanler(handles.bottomright, lines,   {x:1, y:-1});
        install_edge_hanler(handles.move, lines,  null);

        if (on_direction_changed)
            install_direction_handler("line-direction");
    
        //install_move_handler();

        function install_edge_hanler(handle, lines, direction)
        {
            
            function hide(){
                hide_lines(lines);
            };
            function highlight(){
                highlight_lines(lines);
            }
            
            handle.onmouseenter = highlight;    
            handle.onmouseleave = hide;

    
            handle.onmouseup = function(event){
                //line.style["stroke-dasharray"]="none";
                hide();
                handle.onmouseleave = hide;
            };
    
            handle.ondblclick= function(evnet){
                on_auto_shrink(direction);
            };
    
            handle.onmousedown = function(event){
                highlight();
                disable_handle_except(handle);

                handle.onmouseleave = null;

                var lines_pos = {
                    x1 : parseInt(lines.top.getAttribute('x1')),
                    y1 : parseInt(lines.top.getAttribute('y1')),
                    x2 : parseInt(lines.right.getAttribute('x2')),
                    y2 : parseInt(lines.right.getAttribute('y2')),
                };
    
                mouse_start_pos={x: event.clientX,y:event.clientY,};
                var mouse_cur_pos = {x: mouse_start_pos.x, y: mouse_start_pos.y};
    
                console.log(mouse_start_pos);
    
                svg.onmouseup = function(event){
                    svg.onmousemove = null;
                    svg.onmouseup=null;
                    enable_handles();
                    // restore color
                    hide();
                    handle.onmouseleave = hide;
                    
                    var handle_delta = {
                        x: mouse_cur_pos.x - mouse_start_pos.x,
                        y: -(mouse_cur_pos.y - mouse_start_pos.y),  //reverse since it'll be used by 3d-coord system
                    };

                    var ratio_delta = {
                        x: handle_delta.x/view_handle_dimension.x,
                        y: handle_delta.y/view_handle_dimension.y
                    };
                    
                    
                    if (direction)
                        on_edge_changed(ratio_delta, direction);
                    else
                        on_moved(ratio_delta);
                }
    
                svg.onmousemove = function(event){
                    
                    mouse_cur_pos={x: event.clientX,y:event.clientY,};
                    
                    var handle_delta = {
                        x: mouse_cur_pos.x - mouse_start_pos.x,
                        y: mouse_cur_pos.y - mouse_start_pos.y,  // don't reverse direction
                    };

                    move_lines(handle_delta, direction);
                }
            };
        }
    
        function install_direction_handler(linename){
            var handle = document.getElementById(view_prefix+linename+"-handle");
            var line = document.getElementById(view_prefix+linename);
            var svg = document.getElementById(view_prefix+"view-svg");
    
            handle.onmouseenter = function(event){
                line.style.stroke="yellow";
            };
    
            handle.onmouseleave = hide;
    
            handle.ondblclick= function(evnet){
                transform_bbox("z_rotate_reverse");
            };
    
    
            function hide(event){
                line.style.stroke="#00000000";
            };
    
            handle.onmouseup = function(event){
                //line.style["stroke-dasharray"]="none";
                line.style.stroke="#00000000";
                handle.onmouseleave = hide;
            };
    
            handle.onmousedown = function(event){
                

                line.style.stroke="yellow";
                handle.onmouseleave = null;
                highlight_lines(lines);
                disable_handle_except(handle);



                var handle_center={
                    x: parseInt(line.getAttribute('x1')),
                }
    
                mouse_start_pos={
                    x: event.clientX,
                    y:event.clientY,
    
                    handle_offset_x: handle_center.x - event.clientX,                
                };
    
    
                var mouse_cur_pos = {x: mouse_start_pos.x, y: mouse_start_pos.y};
    
                console.log(mouse_start_pos);
    
                var theta = 0;
    
                svg.onmousemove = function(event){
                    
                    mouse_cur_pos={x: event.clientX,y:event.clientY,};
                    
                    var handle_center_cur_pos = {
                        x: mouse_cur_pos.x + mouse_start_pos.handle_offset_x - view_port_pos.x,
                        y: mouse_cur_pos.y - view_port_pos.y,
                    };
    
                    
    
                    theta = Math.atan2(
                        handle_center_cur_pos.y-view_center.y,  
                        handle_center_cur_pos.x-view_center.x);
                    console.log(theta);

                    rotate_lines(theta);
                };

                svg.onmouseup = function(event){
                    svg.onmousemove = null;
                    svg.onmouseup=null;
    
                    // restore color
                    line.style.stroke="#00000000";
                    enable_handles();
                    handle.onmouseleave = hide;


                    if (theta == 0){
                        return;
                    }
    
                    on_direction_changed(-theta-Math.PI/2);
                    
                };

                
            };
        }
    
        function on_key_down(event){
            event.preventDefault();
            event.stopPropagation();
            console.log("key down!")
        }

        /*
        document.getElementById("z-view-manipulator").onmouseenter = function(){
            document.getElementById("z-v-table-translate").style.display="inherit";
            document.getElementById("z-v-table-scale").style.display="inherit";
            document.getElementById("z-v-table-shrink").style.display="inherit";
        };
    
        document.getElementById("z-view-manipulator").onmouseleave = function(){
            document.getElementById("z-v-table-translate").style.display="none";
            document.getElementById("z-v-table-scale").style.display="none";
            document.getElementById("z-v-table-shrink").style.display="none";
        };
        */
    
        document.getElementById("z-v-shrink-left").onclick = function(event){
            var points = data.world.get_points_of_box_in_box_coord(selected_box);
    
            if (points.length == 0){
                return;
            }
    
            var minx = 0;
            for (var i in points){
                if (points[i][0] < minx){
                    minx = points[i][0];
                }
            }
    
            
            var delta = minx + selected_box.scale.x/2;
            console.log(minx, delta);
            translate_box(selected_box, 'x', delta/2 );
            selected_box.scale.x -= delta;
            on_box_changed(selected_box);
        };
    
        document.getElementById("z-v-shrink-right").onclick = function(event){
            auto_shrink("x",1);
        }
        
    }

    return {
        update_view_handle: update_view_handle,
        init_view_operation: init_view_operation,
    }
}

// direction: 1, -1
// axis: x,y,z
function auto_shrink(direction){
    var points = data.world.get_points_of_box_in_box_coord(selected_box);

    if (points.length == 0){
        return;
    }

    var extreme= {
        max: {        
            x:-100000,
            y:-100000,
            z:-100000,
        },

        min: {        
            x:1000000,
            y:1000000,
            z:1000000,
        },
    };
    
    var max=extreme.max;
    var min=extreme.min;

    for (var i in points){
        if (points[i][0] > max.x) {
            max.x = points[i][0];
        } else if (points[i][0] < min.x){
            min.x = points[i][0];
        }

        if (points[i][1] > max.y){
            max.y = points[i][1];
        }else if (points[i][1] < min.y){
            min.y = points[i][1];
        }

        if (points[i][2] > max.z){
            max.z = points[i][2];
        }else if (points[i][2] < min.z){
            min.z = points[i][2];
        }
    }


    
    if (!direction){
        
    }

    for (var axis in direction){

        if (direction[axis] !=0){

            var end = "max";
            if (direction[axis] === -1){
                end = "min";
            }

            var delta = selected_box.scale[axis]/2 - direction[axis]*extreme[end][axis] - 0.01;

            console.log(extreme, delta);
            translate_box(selected_box, axis, -direction[axis]* delta/2 );
            selected_box.scale[axis] -= delta;
        }
    }
    
    on_box_changed(selected_box);
}

function on_edge_changed(delta, direction){
    console.log(delta);

    translate_box(selected_box, 'x', delta.x/2 * direction.x);
    translate_box(selected_box, 'y', delta.y/2 * direction.y);
    translate_box(selected_box, 'z', delta.z/2 * direction.z);

    selected_box.scale.x += delta.x;
    selected_box.scale.y += delta.y;
    selected_box.scale.z += delta.z;
    on_box_changed(selected_box);
}

function on_z_edge_changed(ratio, direction){

    var delta = {
        x: selected_box.scale.x * ratio.x * direction.x,
        y: selected_box.scale.y * ratio.y * direction.y,
        z: 0,
    };

    direction.z = 0;

    on_edge_changed(delta, direction);
}

function on_z_direction_changed(theta){
    var _tempQuaternion = new Quaternion();
    var rotationAxis = new Vector3(0,0,1);
    selected_box.quaternion.multiply( _tempQuaternion.setFromAxisAngle( rotationAxis, theta ) ).normalize();
    on_box_changed(selected_box);
}


function on_z_moved(ratio){
    var delta = {
        x: selected_box.scale.x*ratio.x,
        y: selected_box.scale.y*ratio.y
    };

    
    translate_box(selected_box, "x", delta.x);
    translate_box(selected_box, "y", delta.y);

    on_box_changed(selected_box);
}

var on_z_auto_shrink  = auto_shrink;


var z_view_handle = create_view_handler("z-", on_z_edge_changed, on_z_direction_changed, on_z_auto_shrink, on_z_moved);




function on_y_edge_changed(ratio, direction){

    var delta = {
        x: selected_box.scale.x * ratio.x * direction.x,
        z: selected_box.scale.z * ratio.y * direction.y,
        y: 0,
    };

    direction ={
        x: direction.x,
        z: direction.y,
        y: 0,
    };

    on_edge_changed(delta, direction);
}

function on_y_auto_shrink(direction){
    
    direction = {
        x: direction.x,
        y: 0,
        z: direction.y,
    }

    auto_shrink(direction);
}

function on_y_moved(ratio){
    var delta = {
        x: selected_box.scale.x*ratio.x,
        z: selected_box.scale.z*ratio.y
    };

    
    translate_box(selected_box, "x", delta.x);
    translate_box(selected_box, "z", delta.z);

    on_box_changed(selected_box);
}

function on_y_direction_changed(theta){
    //selected_box.rotation.x += theta;
    //on_box_changed(selected_box);
    var _tempQuaternion = new Quaternion();
    var rotationAxis = new Vector3(0, 1, 0);
    selected_box.quaternion.multiply( _tempQuaternion.setFromAxisAngle( rotationAxis, -theta ) ).normalize();
    on_box_changed(selected_box);
}


var y_view_handle = create_view_handler("y-", on_y_edge_changed, on_y_direction_changed, on_y_auto_shrink, on_y_moved);




function on_x_edge_changed(ratio, direction){

    var delta = {
        y: selected_box.scale.y * ratio.x * direction.x,
        z: selected_box.scale.z * ratio.y * direction.y,
        x: 0,
    };

    direction ={
        y: direction.x,
        z: direction.y,
        x: 0,
    };

    on_edge_changed(delta, direction);
}

function on_x_auto_shrink(direction){

    direction = {
        x: 0,
        y: direction.x,
        z: direction.y,
    }

    auto_shrink(direction);
}


function on_x_moved(ratio){
    var delta = {
        y: selected_box.scale.y*ratio.x,
        z: selected_box.scale.z*ratio.y
    };

    
    translate_box(selected_box, "y", delta.y);
    translate_box(selected_box, "z", delta.z);

    on_box_changed(selected_box);
}

function on_x_direction_changed(theta){
    //selected_box.rotation.x += theta;
    //on_box_changed(selected_box);
    var _tempQuaternion = new Quaternion();
    var rotationAxis = new Vector3(1,0,0);
    selected_box.quaternion.multiply( _tempQuaternion.setFromAxisAngle( rotationAxis, theta ) ).normalize();
    on_box_changed(selected_box);

}


var x_view_handle = create_view_handler("x-", on_x_edge_changed, on_x_direction_changed, on_x_auto_shrink, on_x_moved);


var view_handles = {
    init_view_operation: function(){
        z_view_handle.init_view_operation();
        y_view_handle.init_view_operation();
        x_view_handle.init_view_operation();
    },

    update_view_handle: function(){
        z_view_handle.update_view_handle(views[1].viewport, {x: selected_box.scale.x, y:selected_box.scale.y});
        y_view_handle.update_view_handle(views[2].viewport, {x: selected_box.scale.x, y:selected_box.scale.z});
        x_view_handle.update_view_handle(views[3].viewport, {x: selected_box.scale.y, y:selected_box.scale.z});
    }, 

    hide: function(){
        document.getElementById("z-view-manipulator").style.display="none";
        document.getElementById("y-view-manipulator").style.display="none";
        document.getElementById("x-view-manipulator").style.display="none";
    },

    show: function(){
        document.getElementById("z-view-manipulator").style.display="inline-flex";
        document.getElementById("y-view-manipulator").style.display="inline-flex";
        document.getElementById("x-view-manipulator").style.display="inline-flex";
    },
}


export {view_handles} 