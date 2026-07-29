CREATE TABLE standings (
  id TEXT PRIMARY KEY,
  group_name TEXT NOT NULL DEFAULT 'Grupo 1',
  place INTEGER,
  team TEXT NOT NULL,
  played INTEGER,
  won INTEGER,
  drawn INTEGER,
  lost INTEGER,
  goals_for INTEGER,
  goals_against INTEGER,
  goal_difference INTEGER,
  penalty_points INTEGER,
  points INTEGER,
  sort_order INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-01','Grupo 1','1','ATLETICO PEDIGREE',9,7,1,1,47,29,18,0,22,1);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-02','Grupo 1','2','SAN IGNACIO FC',8,7,0,1,61,24,37,0,21,2);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-03','Grupo 1','3','COVERPACK',8,7,0,1,59,28,31,0,21,3);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-04','Grupo 1','4','AYAMSA',9,7,0,2,42,24,18,0,21,4);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-05','Grupo 1','5','BRASIL JR',8,6,1,1,47,22,25,0,19,5);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-06','Grupo 1','6','TRAPEROS FC',7,5,0,2,41,28,13,0,15,6);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-07','Grupo 1','7','DA AUTOMOTIVE',7,4,1,2,46,34,12,0,13,7);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-08','Grupo 1','8','CELLSUN',8,4,1,3,27,31,-4,0,13,8);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-09','Grupo 1','9','DM MEXICANA',9,3,1,5,37,36,1,0,10,9);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-10','Grupo 1','10','CARTOMONTERREY FC',9,2,2,5,20,35,-15,0,8,10);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-11','Grupo 1','11','LOS TRANSPORTISTAS',5,2,1,2,30,23,7,0,7,11);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-12','Grupo 1','12','FC MOTION',6,2,1,3,23,25,-2,0,7,12);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-13','Grupo 1','13','HIJOS DEL SEÑOR',9,2,1,6,36,40,-4,0,7,13);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-14','Grupo 1','14','CHAROLITAS FC',7,1,3,3,21,29,-8,0,6,14);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-15','Grupo 1','15','BARDAL F.C',9,2,0,7,25,55,-30,0,6,15);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-16','Grupo 1','16','PTU FC',2,1,1,0,9,4,5,0,4,16);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-17','Grupo 1','17','CHETOS F.C',5,0,0,5,6,44,-38,0,0,17);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-18','Grupo 1','18','NIPPON EXPRESS (baja)',5,2,1,2,19,18,1,0,7,18);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-19','Grupo 1','19','DEPORTIVO JJ (baja)',6,2,0,4,18,24,-6,0,6,19);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-20','Grupo 1','20','INICS FC (baja)',5,1,1,3,17,21,-4,0,4,20);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-21','Grupo 1','21','FC ARGOS (baja)',5,1,0,4,10,23,-13,0,3,21);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-22','Grupo 1','22','CYPROS CONVEYORS (baja)',6,0,2,4,7,37,-30,0,2,22);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-23','Grupo 1','23','TALADROS FC (baja)',2,0,0,2,2,8,-6,0,0,23);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-24','Grupo 1','24','AEROLINEAS 67 (baja)',2,0,0,2,0,8,-8,0,0,24);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-25','Grupo 1',NULL,'CADECO',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,25);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-26','Grupo 1',NULL,'KURIYAMA',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,26);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-27','Grupo 1',NULL,'TMR',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,27);
INSERT INTO standings(id,group_name,place,team,played,won,drawn,lost,goals_for,goals_against,goal_difference,penalty_points,points,sort_order) VALUES('standing-28','Grupo 1',NULL,'WARRIORS',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,28);
