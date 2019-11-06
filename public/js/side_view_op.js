
import {transform_bbox, selected_box, translate_box, on_box_changed} from "./main.js"
import {data} from "./data.js"
import {views} from "./view.js"



function create_view_handler(view_prefix, on_edge_changed, on_direction_changed, on_auto_shrink){

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
    
        view_center.x = (left+right)/2;
        view_center.y = (top + bottom)/2;
    
        var de = document.getElementById(view_prefix+"line-left");
        de.setAttribute('x1', Math.ceil(left));
        de.setAttribute('y1', Math.ceil(top));
        de.setAttribute('x2', Math.ceil(left));
        de.setAttribute('y2', Math.ceil(bottom));
    
        de = document.getElementById(view_prefix+"line-left-handle");
        de.setAttribute('x', Math.ceil(left-10));
        de.setAttribute('y', Math.ceil(top+10));
        de.setAttribute('height', Math.ceil(bottom-top-20));
        de.setAttribute('width', 20);
    
    
        de = document.getElementById(view_prefix+"line-right");
        de.setAttribute('x1', Math.ceil(right));
        de.setAttribute('y1', Math.ceil(top));
        de.setAttribute('x2', Math.ceil(right));
        de.setAttribute('y2', Math.ceil(bottom));
    
        de = document.getElementById(view_prefix+"line-right-handle");
        de.setAttribute('x', Math.ceil(right-10));
        de.setAttribute('y', Math.ceil(top+10));
        de.setAttribute('height', Math.ceil(bottom-top-20));
        de.setAttribute('width', 20);
    
    
    
    
        de = document.getElementById(view_prefix+"line-top");
        de.setAttribute('x1', Math.ceil(left));
        de.setAttribute('y1', Math.ceil(top));
        de.setAttribute('x2', Math.ceil(right));
        de.setAttribute('y2', Math.ceil(top));
    
        de = document.getElementById(view_prefix+"line-top-handle");
        de.setAttribute('x', Math.ceil(left+10));
        de.setAttribute('y', Math.ceil(top-10));
        de.setAttribute('width', Math.ceil(right-left-20));
        de.setAttribute('height', 20);
    
    
        de = document.getElementById(view_prefix+"line-bottom");
        de.setAttribute('x1', Math.ceil(left));
        de.setAttribute('y1', Math.ceil(bottom));
        de.setAttribute('x2', Math.ceil(right));
        de.setAttribute('y2', Math.ceil(bottom));
    
        de = document.getElementById(view_prefix+"line-bottom-handle");
        de.setAttribute('x', Math.ceil(left+10));
        de.setAttribute('y', Math.ceil(bottom-10));
        de.setAttribute('width', Math.ceil(right-left-20));
        de.setAttribute('height', 20);
    
        //direction
        if (on_direction_changed){
            de = document.getElementById(view_prefix+"line-direction");
            de.setAttribute('x1', Math.ceil((left+right)/2));
            de.setAttribute('y1', Math.ceil((top+bottom)/2));
            de.setAttribute('x2', Math.ceil((left+right)/2));
            de.setAttribute('y2', Math.ceil(top));
        
            de = document.getElementById(view_prefix+"line-direction-handle");
            de.setAttribute('x', Math.ceil((left+right)/2-10));
            de.setAttribute('y', Math.ceil(top+10));    
            de.setAttribute('height', Math.ceil((bottom-top)/2-20));
        }
        else{
            de = document.getElementById(view_prefix+"line-direction");
            de.style.display = "none";
        
            de = document.getElementById(view_prefix+"line-direction-handle");
            de.style.display = "none";
        }
    
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
    
        
        install_edge_hanler("line-left", "x", -1,1);
        install_edge_hanler("line-right", "x", 1, 1);
        install_edge_hanler("line-top", "y", -1, -1);
        install_edge_hanler("line-bottom", "y", 1, -1);

        if (on_direction_changed)
            install_direction_handler("line-direction");
    
        function install_edge_hanler(linename, axis, direction, axis_direction)
        {
            var handle = document.getElementById(view_prefix+linename+"-handle");
            var line = document.getElementById(view_prefix+linename);
            var svg = document.getElementById(view_prefix+"view-svg");
    
            handle.onmouseenter = function(event){
                line.style.stroke="yellow";
            };
    
            handle.onmouseleave = hide;
    
            
            function hide(event){
                    line.style.stroke="#00000000";
            };
    
            handle.onmouseup = function(event){
                //line.style["stroke-dasharray"]="none";
                line.style.stroke="#00000000";
                handle.onmouseleave = hide;
            };
    
            handle.ondblclick= function(evnet){
                on_auto_shrink(axis,direction*axis_direction);
            };
    
            handle.onmousedown = function(event){
                line.style.stroke="yellow";            
                handle.onmouseleave = null;
    
    
                mouse_start_pos={x: event.clientX,y:event.clientY,};
                var mouse_cur_pos = {x: mouse_start_pos.x, y: mouse_start_pos.y};
    
                console.log(mouse_start_pos);
                var line_pos = {
                    x: parseInt(line.getAttribute('x1')),
                    y: parseInt(line.getAttribute('y1')),
                }
    
                svg.onmouseup = function(event){
                    svg.onmousemove = null;
                    svg.onmouseup=null;

                    // restore color
                    line.style.stroke="#00000000";
                    handle.onmouseleave = hide;
                    
                    var mouse_delta = (mouse_cur_pos[axis] - mouse_start_pos[axis])*direction;
                    if (mouse_delta == 0){
                        return;
                    }
    
                    var ratio = mouse_delta/view_handle_dimension[axis];
                    on_edge_changed(ratio, axis, direction, axis_direction);
                }
    
                svg.onmousemove = function(event){
                    
                    mouse_cur_pos={x: event.clientX,y:event.clientY,};
                    
                    var pos = mouse_cur_pos[axis] - mouse_start_pos[axis] + line_pos[axis];
                    //console.log(mouse_cur_pos, pos);
                    //document.getElementById("line-top").setAttribute('x1', pos);
                    line.setAttribute(axis+1, pos);
                    line.setAttribute(axis+2, pos);
    
                    //handle.setAttribute(axis, pos-10);
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
    
                svg.onmouseup = function(event){
                    svg.onmousemove = null;
                    svg.onmouseup=null;
    
                    // restore color
                    line.style.stroke="#00000000";
                    handle.onmouseleave = hide;


                    if (theta == 0){
                        return;
                    }
    
                    on_direction_changed(-theta-Math.PI/2);
                    
                }
    
                svg.onmousemove = function(event){
                    
                    mouse_cur_pos={x: event.clientX,y:event.clientY,};
                    
                    var handle_center_cur_pos = {
                        x: mouse_cur_pos.x + mouse_start_pos.handle_offset_x - view_port_pos.x,
                        y: mouse_cur_pos.y - view_port_pos.y,
                    };
    
                    var line_len = view_handle_dimension.y;
    
                    theta = Math.atan2(
                        handle_center_cur_pos.y-view_center.y,  
                        handle_center_cur_pos.x-view_center.x);
                    console.log(theta);
                    var line_end = {
                        x: line_len*Math.cos(theta) + view_center.x,
                        y: line_len*Math.sin(theta) + view_center.y,
                    };
    
                    line.setAttribute("x2", line_end.x);
                    line.setAttribute("y2", line_end.y);                
                }
            };
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
function auto_shrink(axis, direction){
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

    var end = "max";
    if (direction === -1){
        end = "min";
    }

    var delta = selected_box.scale[axis]/2 - direction*extreme[end][axis];

    console.log(extreme, delta);
    translate_box(selected_box, axis, -direction* delta/2 );
    selected_box.scale[axis] -= delta;
    on_box_changed(selected_box);
}


function on_z_edge_changed(ratio, axis, direction, axis_direction){
    var delta = selected_box.scale[axis]*ratio;
    console.log(delta);

    translate_box(selected_box, axis, delta/2*direction*axis_direction);

    selected_box.scale[axis] += delta;
    on_box_changed(selected_box);
}

function on_z_direction_changed(theta){
    selected_box.rotation.z += theta;
    on_box_changed(selected_box);
}

var on_z_auto_shrink  = auto_shrink;


var z_view_handle = create_view_handler("z-", on_z_edge_changed, on_z_direction_changed, on_z_auto_shrink);




function on_y_edge_changed(ratio, axis, direction, axis_direction){

    if (axis=="y"){
        axis= "z"        
    }
    var delta = selected_box.scale[axis]*ratio;
    console.log(delta);

    translate_box(selected_box, axis, delta/2*direction*axis_direction);

    selected_box.scale[axis] += delta;
    on_box_changed(selected_box);
}

function on_y_direction_changed(theta){
    /*selected_box.rotation.y += -theta;
    on_box_changed(selected_box);
    */
}

function on_y_auto_shrink(axis, direction){
    if (axis=='y'){
        axis ='z';
    }

    auto_shrink(axis, direction);
}

var y_view_handle = create_view_handler("y-", on_y_edge_changed, null, on_y_auto_shrink);


var view_handles = {
    init_view_operation: function(){
        z_view_handle.init_view_operation();
        y_view_handle.init_view_operation();
    },

    update_view_handle: function(){
        z_view_handle.update_view_handle(views[1].viewport, {x: selected_box.scale.x, y:selected_box.scale.y});
        y_view_handle.update_view_handle(views[2].viewport, {x: selected_box.scale.x, y:selected_box.scale.z});
    }, 

    hide: function(){
        document.getElementById("top-view-manipulator").style.display="none";
        document.getElementById("middle-view-manipulator").style.display="none";
    },

    show: function(){
        document.getElementById("top-view-manipulator").style.display="inline-flex";
        document.getElementById("middle-view-manipulator").style.display="inline-flex";
    },
}


export {view_handles} 