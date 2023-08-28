// /////////////////////////////////////////////////////////////////
// Drawing and Animation
// /////////////////////////////////////////////////////////////////

// Drawing Helpers
function update_projection_parameters() {
    const [width, height] = canvas_size;
    const [n_cols, n_rows] = matrix_dims;
    const y_scale = (height - 2*projection_pad)/n_rows;
    const x_scale = (width - 2*projection_pad)/n_cols;
    projection_scale = Math.min(x_scale, y_scale);
}

function project(x, y) {
    // We have a coordinate system for bytes and words, projected
    // onto the canvas using this function
    return [x*projection_scale+projection_pad, 
            y*projection_scale+projection_pad];
}

function inv_project(x, y) {
    // Map matrix coordinates (bytes) to our coordinate system; used 
    // for mouse hover coordinates
    return [(x-projection_pad)/projection_scale, 
            (y-projection_pad)/projection_scale];
}

function relative_mouse_position(mouse_event) {
    const rect = mouse_event.target.getBoundingClientRect();
    const x = mouse_event.clientX - rect.left;
    const y = mouse_event.clientY - rect.top;
    return [x, y];
}

function rect(x1, y1, x2, y2) {
    // Alternative rectangle drawing function that instead of
    // width and height takes coordinates
    return ctx.rect(x1, y1, x2-x1, y2-y1);
}

function stroke_with_halo(halo_width) {
    const stroke_style = ctx.strokeStyle;
    const line_width = ctx.lineWidth;
    const line_dash = ctx.getLineDash();
    ctx.lineWidth = halo_width;
    ctx.strokeStyle = '#fff';
    ctx.setLineDash([]);
    ctx.stroke();
    ctx.lineWidth = line_width;
    ctx.strokeStyle = stroke_style;
    ctx.setLineDash(line_dash);
    ctx.stroke();
}

// Main Drawing
function draw_grid(highlight=undefined) {
    const [n_cols, n_rows] = matrix_dims;
    if(highlight) {
        let [col, row] = highlight;
        col = Math.trunc(col/word_size) * word_size;
        rect(...project(col, 0), 
             ...project(col+word_size, n_rows));
        rect(...project(0, row),
             ...project(n_cols, row+1));
        ctx.fillStyle = grid_highlight_fill_style;
        ctx.fill();
    }
    // Byte lines
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.lineWidth = grid_byte_line_width;
    ctx.strokeStyle = grid_byte_stroke_style;
    for(let i = 0; i < n_cols*word_size; i++) {
        if(i%word_size == 0) {
            continue;
        }
        ctx.moveTo(...project(i, 0));
        ctx.lineTo(...project(i, n_rows));
    }
    ctx.stroke();
    // Word lines 
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.lineWidth = grid_word_line_width;
    ctx.strokeStyle = grid_word_stroke_style;
    // This does not support the case where a word is longer
    // than a row of our matrix, so each horizontal line is a solid
    // line.
    for(let i = 0; i < n_rows; i++) {
        ctx.moveTo(...project(0, i));
        ctx.lineTo(...project(n_cols*word_size, i));   
    }
    // Vertical word lines
    const n_cols_words = Math.trunc(n_cols/word_size);
    for(let i = 0; i < n_cols_words; i++) {
        ctx.moveTo(...project(i*word_size, 0));
        ctx.lineTo(...project(i*word_size, n_rows));
    }
    ctx.stroke();
}

function draw_sequence(upto = -1) {
    // Animation-specific stuff: to draw everything at once, just
    // set upto to -1; if upto is not negative, only draw the first 
    // `upto` indices. If it is a fraction, draw a partial line for
    // the last index.
    if(upto < 0) {
        upto = sequence.length;
    }
    let fraction = 1;
    if(Math.ceil(upto) != upto) {
        fraction = upto % 1;
        upto = Math.ceil(upto);
    }

    let [n_cols, n_rows] = matrix_dims;
    let last_index = -1;
    let [last_x, last_y] = [0, 0];
    let index_counts = {};
    for(let i = 0; i < sequence.length; i++) {;
        // Calculate position
        const index = sequence[i];
        let [x, y] = offset_to_matrix_coords(index);

        // We can have multiple reads of the same matrix element;
        // if this happens, we slightly offset the y coordinate of
        // that read so it does not overlap with the others of the
        // same element
        if(!index_counts[index]) {
            index_counts[index] = 1;
        } else if(!show_repetitions) {
            break;
        }
        if(show_repetitions) {
            const n_repeats = reverse_sequence[index].length;
            const y_offs = index_counts[index] * (0.75/(n_repeats+1));
            index_counts[index]++;
            y += y_offs + 0.125;
        } else {
            y += 0.5;
        }
        
        // Actual drawing; solid line for memory-adjacent elements
        // accessed in-sequence; dashed line if we jump in memory.
        // Non-manhattan neighbors that are technically memory 
        // adjacent looks weird if we draw solidly, so dash those
        // too
        if(i <= upto) {
            ctx.strokeStyle = interpolate_hsl(hsl_start, hsl_end,
                                              i/sequence.length);
        } else {
            ctx.strokeStyle = inactive_stroke_style;
        }
        if(i > 0) {
            draw_connection(last_index, index, [last_x, last_y], 
                            [x, y],
                            (i == upto ? 
                                Math.min(1, 2*fraction) : 1));
        }
        draw_word(index, [x, y],
                  (i == upto ? 
                   Math.max(0, 2*fraction-1) : 1));
        last_index = index;
        [last_x, last_y] = [x, y];
    }
}

function draw_connection(index_1, index_2, p_1, p_2, fraction) {
    let [x1, y1] = p_1;
    let [x2, y2] = p_2;
    x1 = x1 + (word_size-1) + 0.66; // room for word
    x2 = x2 + 0.33;
    const is_consecutive_read = 
        (index_2 == index_1 + word_size
         && are_manhattan_neighbors([x1, y1], [x2, y2], word_size));
    //x2 = x1 + fraction*(x2-x1);
    //y2 = y1 + fraction*(y2-y1);
    if(!is_consecutive_read) {
        ctx.setLineDash(connection_line_dash);
        ctx.lineWidth = connection_line_width;
        ctx.beginPath();
        ctx.moveTo(...project(x1, y1));
        const x_diff = x1-x2;
        const x_diff_sgn = (x1-x2 < 0 ? -1 : 1);
        const y_diff = y1-y2;
        if(Math.abs(y1-y2) < 0.75) { // Horizontal jump; draw an arc
            ctx.bezierCurveTo(...project(x1-x_diff_sgn*0.33, y1-0.33),
                              ...project(x2+x_diff_sgn*0.33, y1-0.33),
                              ...project(x2, y2));
        } else if(x_diff > 0) { 
            // Jumping left in the X dimension
            ctx.bezierCurveTo(...project(x1, y1-0.33*y_diff),
                              ...project(x2, y2+0.33*y_diff),
                              ...project(x2, y2));
        } else {
            ctx.bezierCurveTo(...project(x1-0.33*x_diff, y1),
                              ...project(x2+0.33*x_diff, y2),
                              ...project(x2, y2));
        }
        stroke_with_halo(2*ctx.lineWidth);
    } else {
        ctx.setLineDash(word_line_dash);
        ctx.lineWidth = word_line_width;
        ctx.beginPath();
        ctx.moveTo(...project(x1, y1));
        ctx.lineTo(...project(x2, y2));
        ctx.stroke();
    }
}

function draw_word(index, p, fraction) {
    let [x1, y1] = p;
    x1 += 0.33;
    let [x2, y2] = [x1 + (word_size-1) + 0.33, y1];
    x2 = x1 + fraction*(x2-x1);
    y2 = y1 + fraction*(y2-y1);
    ctx.setLineDash(word_line_dash);
    ctx.lineWidth = word_line_width;
    ctx.beginPath();
    ctx.moveTo(...project(x1, y1));
    ctx.lineTo(...project(x2, y2));
    ctx.stroke();
}

function draw(upto=-1, highlight=undefined) {
    ctx.clearRect(0, 0, canvas_size[0], canvas_size[1]);
    draw_grid(highlight);
    draw_sequence(upto);
}

function animate_sequence() {
    const progress_per_ms = sequence.length / animation_duration;
    const upto = Math.min((Date.now() - animation_start_time) * progress_per_ms + 0.1,
                          sequence.length);
    draw(upto);
    if(upto < sequence.length) {
        requested_frames.push(window.requestAnimationFrame(animate_sequence));
    }
}

function start_animation() {
    animation_start_time = Date.now();
    requested_frames.push(window.requestAnimationFrame(animate_sequence));
}

function cancel_animation() {
    for(const frame_request of requested_frames) {
        window.cancelAnimationFrame(frame_request);
    }
    animation_frame = 0;
}

// Labels (drawn using CSS)
function place_label(id, x, y, text) {
    const e = document.getElementById(id);
    e.innerHTML = text;
    e.style.visibility = 'visible';
    e.style.display = 'block';
    e.style.left = x + 'px';
    e.style.top =  y + 'px';
}

function place_label_matrix_coords(id, x, y, text, anchor='NW') {
    const e = document.getElementById(id);
    const body_rect = document.body.getBoundingClientRect();
    const base_rect = canvas.getBoundingClientRect();
    let [real_x, real_y] = project(x, y);
    real_x = base_rect.left - body_rect.left + real_x;
    real_y = base_rect.top - body_rect.top + real_y;
    return place_label(id, real_x, real_y, text, anchor);
}

function hide_label(id) {
    const e = document.getElementById(id);
    e.style.visibility = 'hidden';
}
