var db = require('../config/connection')
var collection = require('../config/collections');
const { response } = require('express');
const ObjectId = require('mongodb').ObjectId
const bcrypt = require('bcrypt')
module.exports = {


  addproduct: (product, callback) => {
    console.log(product);
    db.get().collection('product').insertOne(product).then((data) => {

      callback(data.insertedId)
    })

  },
  getallproducts: () => {
    return new Promise(async (resolve, reject) => {
      let product = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
      resolve(product)
    })

  },
  deleteproduct: (prodid) => {
    return new Promise((resolve, reject) => {
      const pid = ObjectId(prodid)
      console.log(prodid);
      console.log(ObjectId(prodid))

      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: pid }).then((response) => {
        resolve(response)

      })
    })

  },
  getproductdetails: (prodid) => {
    console.log(prodid)
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: ObjectId(prodid) }).then((product) => {
        resolve(product)
      })
    })
  },
  updateproduct: (prodid, prodetails) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(prodid) }, {
        $set: {
          name: prodetails.name,
          description: prodetails.description,
          price: prodetails.price,
          category: prodetails.category

        }
      }).then((response) => {
        resolve()
      })
    })
  },
  getuserorders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
      console.log(orders);
      resolve(orders)
    })
  },
  changeStatus: (orderid) => {
    return new Promise((resolve, reject) => {
      console.log(orderid);
      db.get().collection(collection.ORDER_COLLECTION)
        .updateOne({ _id: ObjectId(orderid) },
          {
            $set: {
              status: 'shipped'
            }
          }
        ).then(()=>{
          resolve()
        })
    })
  },
  dosignup: (userdata) => {
    return new Promise(async (resolve, reject) => {
      userdata.password = await bcrypt.hash(userdata.password, 10)
      db.get().collection(collection.ADMIN_COLLECTION).insertOne(userdata).then((data) => {
        console.log(data);
        resolve(data.insertedId)
      })
    })

  },
  dologin: (admindata) => {
    return new Promise(async (resolve, reject) => {
      let loginstatus = false
      let response = {}
      let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: admindata.email })
      if (admin) {
        bcrypt.compare(admindata.password, admin.password).then((status) => {
          if (status) {
            console.log('login success');
            response.admin = admin
            response.status = true
            resolve(response)
          } else {
            console.log('login failed');
            resolve({ status: false })
          }
        })

      } else {
        console.log('login failed');
        resolve({ status: false })
      }
    })
  }

}






