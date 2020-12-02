import {FileLoader} from 'three/src/loaders/FileLoader';
import {
    BufferGeometry, Vector2, Vector3, Face3, Geometry, Group, Mesh,
} from 'three'


/**
 * A very basic implementation of an .obj importer.
 *
 * This importer  only supports triangulated faces. No Quad Faces
 * Only Object Name, Mesh and UV data is imported.
 *
 * Other features such as material libraries, groups, Free-form curve/surface, etc. are not supported by this loader.
 */
export default class BasicOBJImporter {
    constructor() {
        // nothing to do
    }

    /**
     *
     * @param {String} assetPath is a String
     * @returns {Group} A Group containing all parsed meshes.
     */
    async importObj(assetPath) {
        let scope = this;
        return new Promise(function (resolve, reject) {
            let tmp_fileLoader = new FileLoader();
            // tmp_fileLoader.setResponseType('arraybuffer');
            // tmp_fileLoader.setResponseType('blob');

            //load the obj file and parse the result
            //console.log('## 1 call FileLoader');
            tmp_fileLoader.load(
                // resource URL
                assetPath,
                // onLoad callback
                function (data) {
                    // loading finished - do parsing
                    try{
                        let parsed_mesh = scope.parse(data);
                        //console.log('## 3 parsed mesh')
                        resolve(parsed_mesh);
                    }catch (e) {
                        reject('An error happened: ' + e);
                    }
                },
                // onProgress callback
                function (xhr) {
                    //console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
                },
                // onError callback
                function (err) {
                    reject('An error happened: ' + err);
                }
            );
            //console.log('## 2 after FileLoader call')
        });

    }

    /**
     *
     * @param {ArrayBuffer} assetPath is a String
     */
    parse(content) {
        //  console.log( content );

        // iterate over each line and process it
        // TODO research, if ArrayBuffer, or Blob could be used for more efficient reading
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
        // https://developer.mozilla.org/en-US/docs/Web/API/Blob

        let objectName = '';

        let geometry = new Geometry();
        let tmp_normalList = [];
        let tmp_uvList = [];

        let lines = content.split('\n');
        let currentLine = '';

        for (let i = 0; i < lines.length; i++) {
            //console.log( currentLine );
            // iterate over all lines
            currentLine = lines[i];

            if (currentLine.length == 0) continue; // empty line

            let linetype = currentLine.charAt(0);

            // https://de.wikipedia.org/wiki/Wavefront_OBJ
            // http://www.martinreddy.net/gfx/3d/OBJ.spec
            // not supported: usemtl, g, s, Free-form surfaces

            switch (linetype) {
                case '#': // comment
                    break;
                case 'o': // object name
                    objectName = currentLine.split(/o\s/)[1];
                    break;
                case 'v': // vertex related
                    let secondChar = '';
                    if (currentLine.length >= 1)
                        secondChar = currentLine.charAt(1)
                    let splitted_line = currentLine.split(/\s+/);

                    switch (secondChar) {
                        case ' ': // v - vertex
                            geometry.vertices.push(new Vector3(
                                parseFloat(splitted_line[1]),
                                parseFloat(splitted_line[2]),
                                parseFloat(splitted_line[3]),
                            ));
                            break;
                        case 't': // vt - uv
                            // relationship will be built when creating faces
                            tmp_uvList.push(new Vector2(
                                parseFloat(splitted_line[1]),
                                parseFloat(splitted_line[2]),
                            ));
                            break;
                        case 'n': // vn - normal
                            // relationship will be set when creating faces
                            tmp_normalList.push(new Vector3(
                                parseFloat(splitted_line[1]),
                                parseFloat(splitted_line[2]),
                                parseFloat(splitted_line[3]),
                            ));
                            break;
                        case '':
                        default:
                            throw 'invalid format'
                            break; // error
                    }
                    break;
                case 'g': // group - not supported by this implementation
                    break;
                case 'f': // face
                    // only supported format: "f <integer A_V> / <integer A_VT> / <integer A_VN> <integer B_V> / ..."
                    // other formats such as "f 1 2 3", "f 2/1 3/1 4/1" or "f 2/1 3/1 4/1" are not supported
                    let splitted_by_space = currentLine.split(/\s+/);

                    if (splitted_by_space.length == 4) { // Face3
                        let v1_splitted = splitted_by_space[1].split(/\//);
                        let v2_splitted = splitted_by_space[2].split(/\//);
                        let v3_splitted = splitted_by_space[3].split(/\//);

                        let index_v1 = v1_splitted[0] - 1;
                        let index_v1_uv = v1_splitted[1] - 1;
                        let index_v1_normal = v1_splitted[2] - 1;

                        let index_v2 = v2_splitted[0] - 1;
                        let index_v2_uv = v2_splitted[1] - 1;
                        let index_v2_normal = v2_splitted[2] - 1;

                        let index_v3 = v3_splitted[0] - 1;
                        let index_v3_uv = v3_splitted[1] - 1;
                        let index_v3_normal = v3_splitted[2] - 1;

                        let face_normals = [
                            tmp_normalList[index_v1_normal],
                            tmp_normalList[index_v2_normal],
                            tmp_normalList[index_v3_normal]
                        ];

                        // https://threejs.org/docs/#api/en/core/Face3
                        let face = new Face3(
                            index_v1,
                            index_v2,
                            index_v3,
                            face_normals // set .vertexNormals instead of face normal
                        );
                        let faceIndex = geometry.faces.length;
                        geometry.faceVertexUvs[0][faceIndex] = [ tmp_uvList[index_v1_uv] , tmp_uvList[index_v2_uv], tmp_uvList[index_v3_uv]];
                        geometry.faces.push(face);
                    }

                    if (splitted_by_space.length != 4) { // Face4
                        throw "only Face3 supported by this implementation!";
                    }
                    break;
                case 's': // smoothing group - not supported by this implementation
                    break;
                default:
                    console.log('unknown obj type: ' + linetype);
            }
        }

        // ## finished data gathering
        let container = new Group();
        let bufferGeometry = new BufferGeometry().fromGeometry(geometry);
        container.add( new Mesh(bufferGeometry) )
        return container;
    }
}