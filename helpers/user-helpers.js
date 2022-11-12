var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('express')
const { unregisterHelper } = require('handlebars')
const ObjectId = require('mongodb').ObjectId
const Razorpay = require('razorpay')
const e = require('express')
const { resolve } = require('path')
var instance = new Razorpay({
  key_id: 'rzp_test_VGAyleWqJrNrBH',
  key_secret: 'XbJzoDNhBcZ4hQyDanit6WW9',
});
module.exports = {
  dosignup: (userdata) => {
    return new Promise(async (resolve, reject) => {
      userdata.password = await bcrypt.hash(userdata.password, 10)
      db.get().collection(collection.USER_COLLECTION).insertOne(userdata).then((data) => {
        console.log(data);
        resolve(data.insertedId)
      })
    })

  },

  dologin: (userdata) => {
    return new Promise(async (resolve, reject) => {
      let loginstatus = false
      let response = {}
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userdata.email })
      if (user) {
        bcrypt.compare(userdata.password, user.password).then((status) => {
          if (status) {
            console.log('login success');
            response.user = user
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
  },
  addtocart: (prodid, userid) => {
    let proObj = {
      item: ObjectId(prodid),
      quantity: 1
    }
    console.log("userid:" + ObjectId(userid));
    console.log("prodid:" + ObjectId(prodid))
    return new Promise(async (resolve, reject) => {
      let yes = true
      let usercart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId.valueOf(userid) })
      if (usercart) {

        let proExist = usercart.product.findIndex(product => product.item == prodid)
        console.log(proExist);
        if (proExist != -1) {
          db.get().collection(collection.CART_COLLECTION).updateOne({ user: ObjectId(userid), 'product.item': ObjectId(prodid) },
            {
              $inc: { 'product.$.quantity': 1 }
            }
          ).then(() => {

            resolve()
          })
        }
        else {
          db.get().collection(collection.CART_COLLECTION)
            .updateOne({ user: ObjectId(userid) },
              {
                $push: { product: proObj }
              }
            ).then((response) => {
              resolve()
            })
        }
      } else {
        let cartobj = {
          user: ObjectId(userid),
          product: [proObj]
        }
        db.get().collection(collection.CART_COLLECTION).insertOne(cartobj).then((response) => {
          resolve()
        })
      }

    })

  },
  getcartproducts: (userid) => {
    return new Promise(async (resolve, reject) => {

      let cartitems = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: ({ user: ObjectId(userid) })
        },
        {
          $unwind: '$product'
        },
        {
          $project: {
            item: '$product.item',
            quantity: '$product.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        }
      ]).toArray()
      // console.log(cartitems[0].product);
      resolve(cartitems)

    })

  },
  getcartcount: (userid) => {
    return new Promise(async (resolve, reject) => {
      let count = 0
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userid) })
      if (cart) {
        count = cart.product.length
      }
      resolve(count)
    })
  },
  changeproductquantity: (details) => {
    details.count = parseInt(details.count)
    details.quantity = parseInt(details.quantity)

    count = parseInt(details.count)
    return new Promise((resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        db.get().collection(collection.CART_COLLECTION)
          .updateOne({ _id: ObjectId(details.cart) },
            {
              $pull: { product: { item: ObjectId(details.product) } }
            }).then((response) => {
              resolve({ removeproduct: true })
            })
      } else {
        db.get().collection(collection.CART_COLLECTION).updateOne({ _id: ObjectId(details.cart), 'product.item': ObjectId(details.product) },
          {
            $inc: { 'product.$.quantity': count }
          }
        ).then((response) => {
          resolve({ status: true })
        })
      }


    })
  },
  removeproductfromcart: (details) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.CART_COLLECTION)
        .updateOne({ _id: ObjectId(details.cart) },
          {
            $pull: { product: { item: ObjectId(details.product) } }
          }).then((response) => {
            resolve({ removeproduct: true })
          })
    })
  },
  gettotalamount: (userid) => {
    return new Promise(async (resolve, reject) => {

      let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: ({ user: ObjectId.valueOf(userid) })
        },
        {
          $unwind: '$product'
        },
        {
          $project: {
            item: '$product.item',
            quantity: '$product.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }
          }
        }

      ]).toArray()
      console.log(total);
      resolve(total[0].total)

    })

  },
  placeorder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      let status = order.paymentMethod === 'COD' ? 'placed' : 'pending'
      let orderobj = {
        deliverydetails: {
          mobile: order.mobile,
          address: order.address,
          pincode: order.pincode,

        },
        userid: ObjectId(order.userid),
        paymentMethod: order.paymentMethod, 
        products: products,
        totalamount: total,
        status: status,
        date: new Date()
      }

      db.get().collection(collection.ORDER_COLLECTION).insertOne(orderobj).then((response) => {
        db.get().collection(collection.CART_COLLECTION).deleteOne({user:ObjectId(order.userid)})
        console.log(response.insertedId); 
        resolve(response.insertedId)
      })
    })
  },
  getcartproductlist: (userid) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userid) })
      resolve(cart.product)
    })
  },
  getuserorders: (userid) => {
    return new Promise(async (resolve, reject) => {
      console.log('userid: ' + userid);
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userid: ObjectId(userid) }).toArray()
      console.log(orders);
      resolve(orders)

    })
  },
  getorderproducts: (orderid) => {
    return new Promise(async (resolve, reject) => {
      console.log(orderid + ' :oderid');

      let orderitems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: ({ user: ObjectId.valueOf(orderid) })
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        }
      ]).toArray()
      // console.log(cartitems[0].product);
      console.log(orderitems);

      resolve(orderitems)

    })
  },
  generateRazorpay: (orderid, total) => {
    return new Promise((resolve, reject) => {
      console.log('razorpayorderid---' + orderid);
      var options = {
        amount: total*100,  // amount in the smallest currency unit
        currency: "INR",
        receipt: "" + orderid
      };
      instance.orders.create(options, function (err, order) {
        if (err) {
          console.log(err);
        } else {
          console.log('amount ' + order.amount);
          resolve(order)
          order = JSON.stringify(order, null, 4);
          console.log('new order: ' + order);


        }

      });

    })
  },
  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      var crypto = require('crypto');
      var hmac = crypto.createHmac('sha256', 'XbJzoDNhBcZ4hQyDanit6WW9');

      hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
      hmac = hmac.digest('hex')
      if (hmac == details['payment[razorpay_signature]']) {
        resolve()
      } else {
        reject()
      }
    })
  },
  changePaymentStatus: (orderid) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION)
        .updateOne({ _id: ObjectId(orderid) },
          {
            $set: {
              status: 'placed'
            }
          }
        ).then(()=>{
          resolve()
        })
    })
  }


}