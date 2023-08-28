// /////////////////////////////////////////////////////////////////
// Utility Functions
// /////////////////////////////////////////////////////////////////

function reversed(array) {
    return array.slice().reverse();
}

function clear(array) {
    array.length = 0;
}

function error(msg) {
    if(!msg) {
        msg = 'Something went wrong. Please reload the page.';
    }
    alert(msg);
    return false;
}

function interpolate_hsl(start, end, i) {
    const [ha, sa, la] = start;
    const [hb, sb, lb] = end;
    const [h, s, l] = [Math.round(ha+(hb-ha)*i), 
                       Math.round(sa+(sb-sa)*i), 
                       Math.round(la+(lb-la)*i)]
    if(h < 0) {
        h = 360 + h;
    }
    return 'hsla('+h+','+s+'%,'+l+'%,1)';
}

function are_manhattan_neighbors([Ax, Ay], [Bx, By], threshold=1) {
    return (Ay == By && Math.abs(Ax-Bx) <= threshold)
           || (Ax == Bx && Math.abs(Ay-By) <= threshold);
}
