const fs = require('fs')
const path = require('path')
const db = require('../models')
const { STORAGE } = require('../app')

const Folder = db.Folder

const getFolders = (req, res) => {
    Folder.find({})
    .populate({
        path: 'owner',
        populate: [{ path: 'role' }]
    })
    .populate('sharedWith')
    .exec((err, folders) => {
        if (err) {
            return res.status(500).end()
        }

        res.json(folders.map(folder => {
            const dir = folder.toJSON()
            delete dir.owner.password
            dir.sharedWith.forEach(magicbox => {
                delete magicbox.default
            })
            return dir
        }))
    })
}

const createFolder = (req, res) => {
    const name = req.body.name

    if (!name) {
        return res.status(400).send('Missing parameters: name.')
    }

    const subDirectory = path.join(req.user.name, name)
    const directory = path.join(STORAGE, subDirectory)
    if (fs.existsSync(directory)) {
        return res.status(400).send('Folder already exists.')
    }
    fs.mkdirSync(directory, { recursive: true })

    new Folder({
        path: subDirectory,
        owner: req.user.id
    }).save((err, folder) => {
        if (err) {
            return res.status(500).end()
        }
        res.json(folder.toJSON())
    })
}

const shareFolder = (req, res) => {
    const folderId = req.body.folderId
    const magicBoxIds = req.body.magicBoxIds

    if (!folderId) {
        return res.status(400).send('Missing parameters: folderId, magicBoxIds.')
    }

    Folder.findByIdAndUpdate(folderId, {
        $push: { sharedWith: { $each: magicBoxIds } }
    }, { new: true }, (err, folder) => {
        if (err) {
            return res.status(500).end()
        }

        if (!folder) {
            return res.status(404).send('Folder not found.')
        }

        res.json(folder.toJSON())
    })
}

module.exports = {
    getFolders,
    createFolder,
    shareFolder
}
