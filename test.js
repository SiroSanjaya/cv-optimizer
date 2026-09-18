function findDuplicates(arr) {
    const count = {};
    arr.forEach(item => { count[item] = (count[item] || 0) + 1; });
    return Object.keys(count).filter(key => count[key] > 1).map(Number);
}

// ==== Cara test manual (copy semua ini ke VS Code, run: node namafile.js) ====
console.log(findDuplicates([1, 2, 3, 2, 4, 5, 3])); // expected: [2,3]
console.log(findDuplicates([1, 1, 1])); // expected: [1]
console.log(findDuplicates([1, 2, 3])); // expected: []