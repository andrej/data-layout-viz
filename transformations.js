
// /////////////////////////////////////////////////////////////////
// Data Layout transform Business Logic
// /////////////////////////////////////////////////////////////////

function recursive_transform(transform, index, accum) {
	if(!transform || transform.length == 0) {
		return accum;
	}
	const [wrap, stride]   = transform[0];
	return recursive_transform(transform.slice(1), 
					Math.trunc(index / wrap),
					accum + Math.trunc(index % wrap) * stride);
}

function max_index(transform) {
	if(!transform || transform.length == 0) {
		return 0;
	}
	wrap   = transform[0][0];
	stride = transform[0][1];
	return wrap*stride + max_index(transform.slice(1));
}

function max_iterations(transform) {
	return transform.reduce(
		(product, dimension) => product*dimension[0], 1);
}

function calculate_sequence() {
	let bound = transforms.reduce(
		(max, transform) => 
		Math.max(max, max_iterations(reversed(transform))), 0);
	clear(sequence);
	reverse_sequence = {};
	for(let i = 0; i < bound; i++) {
		let index = i;
		for(const transform of transforms) {
		index = recursive_transform(reversed(transform), 
						index, 0);
		}
		index *= word_size;
		sequence.push(index);
		if(index in reverse_sequence) {
		reverse_sequence[index].push(i);
		} else {
		reverse_sequence[index] = [i];
		}
	}
	return true;
}

function offset_to_matrix_coords(offset) {
	const n_cols_bytes = matrix_dims[0];
	const row = Math.trunc(offset / n_cols_bytes);
	const col = Math.trunc(offset % n_cols_bytes);
	return [col, row];
}

// Code output
function loop_repr_of_transform(tr) {
	const loop_vars = ['i', 'j', 'k', 'l', 'm', 'n', 'o'];
	if(transform.length > loop_vars.length) {
		return error();
	}
	let out = '';
	for(let i = 0; i < transform.length; i++) {
		let [wrap, stride] = transform[i];
		out += '  '.repeat(i);
		out += 'for ' + loop_vars[i] + ' = 0..<span>' + wrap + '</span>:\n'
	}
	out += '  '.repeat(transform.length);
	out += 'read buf[';
	for(let i = 0; i < transform.length; i++) {
		let [wrap, stride] = transform[i];
		if(i > 0) {
		out += '  '.repeat(transform.length) + '        +';
		}
		out += loop_vars[i] + '*<span>' + stride + '</span>';
		if(i < transform.length-1) {
		out += '\n';
		}
	}
	out += ']';
	return out;
}

function loop_repr_of_transforms(transforms) {
	let out = '';
	for(const transform of transforms) {
		out += loop_repr_of_transform(transform);
	}
	return out;
}

function round_to_word(offset) {
	return Math.trunc(offset/word_size)*word_size;
}
