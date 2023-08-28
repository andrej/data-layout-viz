// /////////////////////////////////////////////////////////////////
// Interactivity / UI
// /////////////////////////////////////////////////////////////////

// UI creation from internal state
function update_transforms_ui() {
    let transforms_root_el = document.getElementById('transforms');
    let transform_els = [];
    for(let i = 0; i < transforms.length; i++) {
        const transform = transforms[i];
        const transform_el = document.createElement('table');
        transform_el.id = 'transform_' + i;
        transform_el.className = 'transform';
        const head_tr_el = document.createElement('tr');
        transform_el.appendChild(head_tr_el);
        const head_td_1_el = document.createElement('td');
        head_tr_el.appendChild(head_td_1_el);
        head_td_1_el.className = 'transform_title';
        head_td_1_el.innerText = 'Wraps';
        const head_td_2_el = document.createElement('td');
        head_tr_el.appendChild(head_td_2_el);
        head_td_2_el.className = 'transform_title';
        head_td_2_el.innerText = 'Strides';
        const head_td_3_el = document.createElement('td');
        head_tr_el.appendChild(head_td_3_el);
        const add_dim_el = document.createElement('button');
        head_td_3_el.appendChild(add_dim_el);
        add_dim_el.innerText = '+';
        add_dim_el.className = 'add_dim_button';
        add_dim_el.addEventListener('click', function(){add_dimension(i);});
        for(let j = 0; j < transform.length; j++) {
            const [wrap, stride] = transform[j];
            const tr_el = document.createElement('tr');
            transform_el.appendChild(tr_el);
            const td_1_el = document.createElement('td');
            tr_el.appendChild(td_1_el);
            const td_2_el = document.createElement('td');
            tr_el.appendChild(td_2_el);
            const td_3_el = document.createElement('td');
            tr_el.appendChild(td_3_el);
            const wrap_id = 'transform_' + i + '_wrap_' + j;
            const wrap_input_el = document.createElement('input');
            td_1_el.appendChild(wrap_input_el);
            wrap_input_el.id = wrap_id;
            wrap_input_el.className = 'wrap';
            wrap_input_el.value = wrap;
            wrap_input_el.type = 'number';
            const stride_id = 'transform_' + i + '_stride_' + j;
            const stride_input_el = document.createElement('input');
            td_2_el.appendChild(stride_input_el);
            stride_input_el.id = stride_id;
            stride_input_el.className = 'stride';
            stride_input_el.value = stride;
            stride_input_el.type = 'number';
            if(j > 0) {
                const move_up_el = document.createElement('button');
                td_3_el.appendChild(move_up_el);
                move_up_el.innerText = '↑';
                move_up_el.addEventListener('click', function(){swap_dimensions(i, j, j-1);});
            }
            if(j < transform.length - 1) {
                const move_up_el = document.createElement('button');
                td_3_el.appendChild(move_up_el);
                move_up_el.innerText = '↓';
                move_up_el.addEventListener('click', function(){swap_dimensions(i, j, j+1);});
            }
            const remove_dim_el = document.createElement('button');
            td_3_el.appendChild(remove_dim_el);
            remove_dim_el.innerText = '-';
            remove_dim_el.className = 'remove_dim_button';
            remove_dim_el.addEventListener('click', function(){remove_dimension(i, j);});
        }
        transform_els.push(transform_el);
    }
    transforms_root_el.textContent = '';
    for(const transform_el of transform_els) {
        transforms_root_el.appendChild(transform_el);
    }
    add_transforms_inputs_event_listeners();
}

function add_transforms_inputs_event_listeners() {
    let transform_els = document.getElementsByClassName('transform');
    for(const transform_el of transform_els) {
        const input_els = transform_el.getElementsByTagName('input');
        for(const input_el of input_els){
            input_el.addEventListener('change', change);
        }
    }
}

// Input Processing
function read_input_number_by_id(id) {
    input_element = document.getElementById(id);
    if(!input_element) {
        return error();
    }
    return parseInt(input_element.value);
}

function read_settings() {
    let word_size_raw = read_input_number_by_id('word_size');
    if(!word_size_raw in [1, 2, 4, 8]) {
        return error('Unsupported word size.');
    }
    word_size = word_size_raw;
    const repetitions_checkbox = document.getElementById('repetitions');
    show_repetitions = repetitions_checkbox.checked;
    return true;
}

function read_input_dimensions() {
    let [width, height] = [read_input_number_by_id('width'),
                           read_input_number_by_id('height')];
    if(0 >= width) {
        return error('Width must be a positive number. (Got '+width+'.)');
    }
    if(0 >= height) {
        return error('Height must be a positive number. (Got '+width+'.)');
    }
    matrix_dims = [width*word_size, height];
    return true;
}

function read_input_transforms() {
    // The following relies heavily on the fact that the iteration
    // over elements is in order of definition in the document. This
    // gives us the dimensions and transforms in the right order.
    transform_inputs = document.getElementsByClassName('transform');
    clear(transforms)
    for(const transform_input of transform_inputs) {
        stride_inputs = transform_input.getElementsByClassName('stride');
        wrap_inputs = transform_input.getElementsByClassName('wrap');
        if(stride_inputs.length != wrap_inputs.length) {
            return error();
        } 
        if(0 == stride_inputs.length) {
            return true;
        }
        transform = []
        for(const wrap_input of wrap_inputs) {
            const wrap = parseInt(wrap_input.value)
            if(0 >= wrap) {
                return error('Wrap ' + wrap_input.id + ' must be a positive number. (Got ' + wrap +'.)');
            }
            transform.push([wrap, 0])
        }
        for(var i = 0; i < stride_inputs.length; i++) {
            var stride_input = stride_inputs[i];
            const stride = parseInt(stride_input.value);
            if(0 > stride) {
                return error('Stride ' + stride_input.id + ' must be a non-negative number. (Got ' + stride + '.)');
            }
            transform[i][1] = stride;
        }
        transforms.push(transform);
    }
    return true;
}

function read_inputs() {
    const success = read_settings() 
                    && read_input_dimensions() 
                    && read_input_transforms();
    update_projection_parameters();
    if(!success) {
        return false;
    }
    return true;
}

// Event handlers
function change(e=undefined) {
    if(!read_inputs()) {
        return;
    }
    update_output();
}

function update_output(animated=true) {
    if(!calculate_sequence()) {
        return;
    }
    document.getElementById("code").innerHTML = 
        loop_repr_of_transforms(transforms);
    if(animated) {
        cancel_animation();
        start_animation();
    } else {
        draw();
    }
}

function hover(e) {
    const [n_cols, n_rows] = matrix_dims;
    let [x, y] = relative_mouse_position(e);
    let [col, row] = inv_project(x, y);
    col = Math.trunc(col);
    row = Math.trunc(row);
    const index = round_to_word(col + row*n_cols);
    if(index in reverse_sequence) {
        cancel_animation();
        // TODO: Give users a choice up to which repetition of the
        // element should be drawn if the same element is repeated.
        const upto = reverse_sequence[index][0];
        draw(upto, [col, row]);
        const index_text = (reverse_sequence[index].length == 1 ?
                            'Index' : 'Indices');
        const joined_indices = reverse_sequence[index].join(', ');
        place_label('mouse_label', e.clientX+10, e.clientY+20, 
                    '<span>' + index_text + ': <span>' + joined_indices +'</span></span>');
        place_label_matrix_coords('col_label', round_to_word(col)+word_size, 0,
                                  '<span>Column: <span>' + Math.trunc(col/word_size) + '</span></span>');
        place_label_matrix_coords('row_label', 0, row+1,
                                  '<span>Row: <span>' + (row+1) + '</span></span>');
    }
}

function mouseout() {
    hide_label('mouse_label');
    hide_label('col_label');
    hide_label('row_label');
    cancel_animation();
    draw();
}

function resize() {
    const canvas = document.getElementById('canvas');
    const width = canvas.clientWidth;
    canvas.width = width;
    canvas.height = width;
    canvas_size = [width, width];
    cancel_animation();
    update_projection_parameters();
    draw();
}

function add_transform() {
    transforms += [[1, 0]];
    update_transforms_ui();
}

function add_dimension(i) {
    transforms[i].unshift([1, 0]);
    update_transforms_ui();
    update_output();
}

function remove_dimension(i, j) {
    transforms[i].splice(j, 1);
    update_transforms_ui();
    update_output();
}

function swap_dimensions(i, j_1, j_2) {
    const [dimension_1, dimension_2] = [transforms[i][j_1], transforms[i][j_2]];
    [transforms[i][j_2], transforms[i][j_1]] = [dimension_1, dimension_2];
    update_transforms_ui();
    update_output();
}

function set_transforms(new_transforms) {
    transforms = new_transforms;
    update_transforms_ui();
    update_output();
}
