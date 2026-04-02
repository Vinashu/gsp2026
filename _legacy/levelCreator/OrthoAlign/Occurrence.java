/*
 * Classe permettant de determiner la position j de la derniere occurrence  
 * du plus long suffixe X[1..i]
 * X[1..n]
 */


public class Occurrence 

{
	public int i; // copie
	public int j; // origine
	
	
	public Occurrence(int copie, int origine)
	
	{
	
		
		this.i=copie;   // J'ai inverse l'ordre
		this.j=origine;
		
		
		//j  debut de la copie dans le cas de DXY ou DYX
		
	    //j  fin de la copie dans le cas de DIXY et DIYX 
		
		
	}
	
}
