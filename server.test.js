const mongoose = require("mongoose");
const chai = require("chai");
const chaihttp = require("chai-http");
const { expect } = chai;

const User = require("./models/User");
const Note = require("./models/Note");
const server = require("./server");
chai.use(chaihttp);

describe("Notes", () => {
  before(done => {
    mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/test");
    const db = mongoose.connection;
    db.on("error", () => console.log("connection error"));
    db.once("open", () => {
      console.log("successfuly connected to database");
      done();
    });
  });

  let token;
  let id;
  let noteId;

  beforeEach(done => {
    const email = "test@test.com";
    const password = "password";

    chai
      .request(server)
      .post("/signup")
      .send({ email, password })
      .end((err, res) => {
        if (err) {
          console.log(err);
          done();
        } else {
          token = res.body.token;
          User.findOne({ email })
            .then(user => {
              id = user.id;
              const note = new Note({
                title: "First Note",
                content: "Here lies my first note.",
                author: id
              });
              note
                .save()
                .then(note => {
                  noteId = note.id;
                  console.log(note);
                  done();
                })
                .catch(err => {
                  console.log(err);
                  done();
                });
            })
            .catch(err => {
              console.log(err);
              done();
            });
        }
      });
  });

  afterEach(done => {
    User.remove({}, err => {
      if (err) console.log(err);
      Note.remove({}, err => {
        if (err) console.log(err);
        done();
      });
    });
  });

  after(done => {
    console.log("database disconnected");
    mongoose.connection.db.dropDatabase(() => {
      mongoose.connection.close(done);
    });
  });

  describe("[POST] request to /signup", () => {
    it("should add a new user", done => {
      const user = {
        email: "test",
        password: "test"
      };
      chai
        .request(server)
        .post("/signup")
        .send({ email: user.email, password: user.password })
        .end((err, res) => {
          if (err) {
            console.error(err);
            done();
          }
          expect(res.status).to.equal(200);
          expect(res.body).to.be.an("object");
          done();
        });
    });

    it("should throw an error when adding a new user", done => {
      const user = {
        email: "test2",
        password: "test"
      };
      chai
        .request(server)
        .post("/signup")
        .send({ email: user.email })
        .end((err, res) => {
          expect(res.status).to.equal(404);
          expect(res.body.error).to.equal("Must provide email and password");
          done();
        });
    });
  });

  describe("[POST] request to /login", () => {
    it("should sign in a user", done => {
      chai
        .request(server)
        .post("/login")
        .send({ email: "test@test.com", password: "password" })
        .end((err, res) => {
          if (err) {
            console.log(err);
            done();
          } else {
            expect(res.body.token).to.equal(token);
            done();
          }
        });
    });
    it("should throw an error logging a user in", done => {
      chai
        .request(server)
        .post("/signup")
        .send({ email: "test@test.com" })
        .end((err, res) => {
          expect(res.status).to.equal(404);
          expect(res.body.error).to.equal("Must provide email and password");
          done();
        });
    });
  });

  describe("[GET] request to /notes", () => {
    it("should get all notes for a user", done => {
      chai.request(server).get('/notes').send({ Authorization: token}).end((err, res) => {
        if (err) {
          console.log(err);
          done();
        } else {
          expect(res.body).to.be.an('object');
          console.log(res);
          expect(res.body.title).to.equal('First Notes');
          done();
        }
      })
    });
  });
});
