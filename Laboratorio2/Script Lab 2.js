db.personas.find({});
db.vehiculos.find({});

// [Seccion 1] Consultar la información de todas las colecciones (db.getCollectionInfos())
db.getCollectionInfos();

// [Seccion 2] Renombrar los campos de la colección a: fullname, phone, email, address y gender.
db.personas.updateMany(
    {},
    {
        $rename: {
            "Nombre-Completo": "fullname",
            "Telefono": "phone",
            "Correo-Electronico": "email",
            "Direccion": "address",
            "Genero": "gender"
        }
    } 
);

// [Seccion 2] Buscar los 15 apellidos menos comunes por género.
db.personas.aggregate([
    {
        $project: {
            gender: 1,
            lastname: { $arrayElemAt: [ { $split: [ "$fullname", " " ] }, -1 ] }
        }
    },
    {
        $group: {
            _id: { gender: "$gender", lastname: "$lastname" },
            count: { $sum: 1 }
        }
    },
    {
        $sort: { count: 1 }
    },
    {
        $group: {
            _id: "$_id.gender",
            bottom_lastnames: { $push: "$_id.lastname" },
            count: { $push: "$count" }
        }
    },
    {
        $sort: { _id: 1 }
    },
    {
        $project: {
            _id: 1,
            bottom_lastnames: { $slice: [ "$bottom_lastnames", 0, 15 ] }
        }
    },
    {
        $out: "personas_gender_lastnames_bottom.json"
    }
]);

// [Seccion 2] Buscar los 5 nombres más comunes por género y ordenarlos de forma descendente.

db.personas.aggregate([
   {
      $project: {
         gender: 1,
         name: {$split: ["$fullname", " "]}
      }
   },
   {
      $unwind: "$name"
   },
   {
      $group: {
         _id: {name: "$name", gender: "$gender"},
         count: {$sum: 1}
      }
   },
   {
      $sort: {count: -1}
   },
   {
      $group: {
         _id: "$_id.gender",
         top_names: { $push: { name: "$_id.name", freq: "$count" } }
      }
   },
   {
      $project: {
         _id: 0,
         gender: "$_id",
         top_names: {$slice: ["$top_names", 5]}
      }
   },
   {
        $out: "personas_gender_firstnames_top.json"
    }
]);

// [Seccion 2] Calcular la cantidad de personas y longitud promedio de username por dominio de email, ordenándolos del más usados a menos.

db.collection.aggregate([
    {
        $project: {
            domain: { $substr: [ "$email", -(($indexOf("@", "$email"))+1), -1 ] },
            username_length: { $strLenCP: "$fullname" }
        }
    },
    {
        $group: {
            _id: "$domain",
            total: { $sum: 1 },
            avg_length: { $avg: "$username_length" }
        }
    },
    {
        $sort: { total: -1 }
    }
]);

db.personas.find({});
// [ Seccion 2 ] Calcular cuántas personas viven en direcciones que contengan las palabras Avenue,Road, Trail, Crossing, Park, Way, Point, Place o ninguna de las anteriores. 
db.personas.aggregate([
    {
        $group: {
            _id: { $regexFind: { input: "$address", regex: /(Avenue|Road|Trail|Crossing|Park|Way|Point|Place)/i } },
            total: { $sum: 1 }
        }
    }
])


// [Seccion 3] Renombrar los campos de la colección a: _id, brand, model, year and price.
db.vehiculos.updateMany({}, {$rename: {"Marca-del-Coche": "Brand", "Modelo-del-Coche": "model", "Año-del-Coche": "year", "Precio-del-Coche": "price"}});

// [Seccion 3] Transformar el campo price a un valor decimal.
db.vehiculos.updateMany({}, [
  {$expr: {$convert: {input: {$toDouble: "$price"}, to: "double"}}},
  {$rename: { "price": "price"}}
]);

// [Seccion 3] Calcular la cantidad de modelos y precio promedio por año por marca.
db.vehiculos.aggregate([
    {
        $addFields: {
            price: {
                
                $substr: [ "$price", 1, { $subtract: [ { $strLenCP: "$price" }, 1 ] } ]
            }
        }
    },
    {
        $group: {
            _id: { brand: "$Brand", year: "$year" },
            total_models: { $sum: 1 },
            avg_price: { $avg: { $convert: { input: "$price", to: "double" } } }
        }
    },
    {
        $group: {
            _id: "$_id.brand",
            stats: {
                $push: {
                    year: "$_id.year",
                    total_models: "$total_models",
                    avg_price: "$avg_price"
                }
            }
        }
    },
    {
        $project: {
            _id: 0,
            brand: "$_id",
            stats: 1
        }
    },
    {
        $out: "vehiculos_brand_stats.json"
    }
]);

// [Seccion 3] Buscar los 20 vehículos más caros de la década de los 90s.

db.vehiculos.aggregate([
    {
        $match: {
            "year": { $gte: 1990, $lt: 2000 }
        }
    },
    {
        $sort: { "price": -1 }
    },
    {
        $limit: 20
    },
    {
        $project: {
            _id: { $concat: [ "$Brand", " ", "$model" ] },
            year: 1,
            price: 1
        }
    }
]);

// [Seccion 3] Buscar las 5 marcas de mayor precio promedio a partir del 2000, para marcas asiáticas y para marcas europeas.

db.vehiculos.distinct("Brand");

db.vehiculos.aggregate([
    {$match: {year:{$gte:2000}}},
    {$group: {_id: "$Brand", avg_price: {$avg: "$price"}}},
    {
        $facet: {
            asian: [
                {$match: {_id: {$in: ["Acura", "Honda", "Hyundai", "Infiniti", "Isuzu", "Kia", "Lexus", "Mazda", "Mitsubishi", "Nissan", "Scion", "Subaru", "Suzuki", "Toyota"]}}},
                {$sort: {avg_price: -1}},
                {$limit: 5}
            ],
            european: [
                {$match: {_id: {$in: ["Alfa Romeo", "Aston Martin", "Audi", "Bentley", "Bugatti", "Citroën", "Ferrari", "Jaguar", "Lamborghini", "Land Rover", "Lotus", "Maserati", "Maybach", "Mercedes-Benz", "MINI", "Morgan", "Porsche", "Rolls-Royce", "Saab", "Spyker", "Volkswagen", "Volvo"]}}},
                {$sort: {avg_price: -1}},
                {$limit: 5}
            ]
        }
    },
    {
        $out: "vehiculos_market_top_brands.json"
    }
]);













db.peliculas.find({});
// [Seccion 4] ( 1 ) 
// Renombrar los campos de la colección a: _id, name, year, genre y ticket_price.

db.peliculas.updateMany(
    {},
    {
        $rename: {
            "Nombre-de-la-pelicula": "name",
            "Año-de-la-pelicula": "year",
            "Genero-de-la-pelicula": "genre",
            "Precio-de-la-entrada-de-la-pelicula": "ticket_price"
        }
    } 
);



// [Seccion 4] ( 2 )
// Transformar los campos: a. gender: convertir a lista de strings b. ticket_price: convertir a decimal

db.peliculas.updateMany({}, [{$set: {genre: {$split: ["$genre", "|"]}}}]);

db.peliculas.updateMany({}, [{$set: {ticket_price: {$toDecimal: {$substr: ["$ticket_price", 1, -1]}}}}]);






// [Seccion 4] ( 3 )
// Buscar las 100 palabras más comunes de los títulos de películas y cuantas veces aparece, ordenadas de más usada a menos.

db.peliculas.aggregate([
    { $project: { words: { $split: ["$name", " "] } } },
    { $unwind: "$words" },
    { $group: { _id: "$words", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 100 },
    { $project: { _id: 0, token: "$_id", total: "$count" } },
    {
        $out: "peliculas_wordcloud.json"
    }
]);


// [Seccion 4] ( 4 )
// Calcular el precio de ticket mínimo, máximo y promedio anual en orden cronológico.
db.peliculas.aggregate([
    { $group: { _id: "$year", price_min: { $min: "$ticket_price" }, price_avg: { $avg: "$ticket_price" }, price_max: { $max: "$ticket_price" } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 1, price_min: 1, price_avg: 1, price_max: 1 } },
    {
        $out: "peliculas_year_pricing.json"
    }
]);


// [Seccion 4] ( 5 )
// Calcular el top 5 de años de estreno de películas para cada género cinematográfico.

db.peliculas.aggregate([
    { $unwind: "$genre" },
    { $group: { _id: { genre: "$genre", year: "$year" }, count: { $sum: 1 } } },
    { $sort: { "_id.year": -1 } },
    { $group: { _id: "$_id.genre", top_years: { $push: "$_id.year" } } },
    { $project: { _id: 1, top_years: { $slice: ["$top_years", 5] } } },
    {
        $out: "peliculas_genre_top_years.json"
    }
]);



