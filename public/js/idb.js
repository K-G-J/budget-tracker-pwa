// variable to hold db connection
let db
//establish a connection to IndexDB database and set it to version 1
const request = indexedDB.open('budget_tracker', 1)
// emit if the database version changes
request.onupgradeneeded = function (event) {
  // save a reference to the database
  const db = event.target.result
  // create an object store (table)
  db.createObjectStore('new_transaction', { autoIncrement: true })
}

request.onsuccess = function (event) {
  // when db is successfully created with its object store (from onupgradedneeded event) or simply established a connection, save reference to db in global variable
  db = event.target.result
  // if app is online sent all local data to api
  if (navigator.onLine) {
    // check if online and send any store data to MongoDB
    uploadTransaction()
  }
}

request.onerror = function (event) {
  console.log(event.target.errorCode)
}

// function when submitting new data
function saveRecord(record) {
  // open transaction with db with read and write permissions
  const transaction = db.transaction(['new_transaction'], 'readwrite')
  // access the object store
  const budgetObjectStore = transaction.objectStore('new_transaction')
  // add record to store
  budgetObjectStore.add(record)
}
// add data to MongoDB
function uploadTransaction() {
  // open a transaction on pending db
  const transaction = db.transaction(['new_transaction'], 'readwrite')
  // access pending object store
  const budgetObjectStore = transaction.objectStore('new_transaction')
  // get all records from store and set to a variable
  const getAll = budgetObjectStore.getAll()

  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse)
          }

          const transaction = db.transaction(['new_transaction'], 'readwrite')
          const budgetObjectStore = transaction.objectStore('new_transaction')
          // clear all items in store
          budgetObjectStore.clear()
        })
        .catch((err) => {
          console.log(err)
        })
    }
  }
}

// listen for app coming back online
window.addEventListener('online', uploadTransaction)
